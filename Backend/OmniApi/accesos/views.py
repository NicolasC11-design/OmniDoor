import json
import numpy as np

from django.contrib.auth.hashers import check_password
from django.db import transaction, models
from django.db.models import Q, F
from django.db.models import Value
from django.db.models.functions import Replace
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import BiometriaUsuario, InformeTurno, RegistroAcceso, Usuario, Vehiculo
from .permissions import IsAdmin, IsSeguridad, IsSeguridadOrAdmin
from .serializers import (
    InformeTurnoSerializer,
    LoginSerializer,
    RegisterSerializer,
    RegistroAccesoSerializer,
    VehiculoSerializer,
    userSerializer,
    UsuarioUpdateSerializer
)


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        data = request.data.copy()
        vector_biometrico = data.pop("vector_biometrico", None)

        serializer = RegisterSerializer(data=data)
        if serializer.is_valid():
            with transaction.atomic():
                user = serializer.save()
                if vector_biometrico and isinstance(vector_biometrico, list):
                    vector_json = json.dumps(vector_biometrico)
                    BiometriaUsuario.objects.update_or_create(
                        usuario=user, defaults={"vector_facial": vector_json, "activo": True}
                    )

            return Response(
                {
                    "mensaje": "Usuario registrado exitosamente. Esperando aprobación del administrador.",
                    "usuario": userSerializer(user).data,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": "Credenciales incorrectas."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = serializer.validated_data["user"]
        if not user.is_active or not user.estado:
            return Response(
                {"error": "Cuenta inactiva. El administrador aún no ha aprobado tu registro."},
                status=status.HTTP_403_FORBIDDEN,
            )

        vector_recibido = request.data.get("vector_biometrico")

        if vector_recibido:
            try:
                biometria = BiometriaUsuario.objects.get(usuario=user, activo=True)
                descriptor = biometria.get_descriptor() if hasattr(biometria, 'get_descriptor') else json.loads(biometria.vector_facial)
                
                vector_guardado = np.array(descriptor, dtype=np.float32)
                vec_input = np.array(vector_recibido, dtype=np.float32)
                distancia = np.linalg.norm(vector_guardado - vec_input)
                UMBRAL_TOLERANCIA = 0.60

                if distancia > UMBRAL_TOLERANCIA:
                    return Response(
                        {"error": f"Verificación facial fallida. Rostro no coincide (Distancia: {distancia:.2f})."},
                        status=status.HTTP_401_UNAUTHORIZED,
                    )

            except BiometriaUsuario.DoesNotExist:
                return Response(
                    {"error": "No tienes un registro biométrico activo en el sistema. Contacta al administrador."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "usuario": userSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


class AdminGestionCuentasView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        usuarios_pendientes = Usuario.objects.filter(is_active=False)
        serializer = userSerializer(usuarios_pendientes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminDashboardStatsView(APIView):
    permission_classes = [IsSeguridadOrAdmin]

    def get(self, request):
        hoy = timezone.now().date()
        primer_dia_mes = hoy.replace(day=1)

        total_vehiculos = Vehiculo.objects.filter(activo=True).count()
        ingresos_hoy = RegistroAcceso.objects.filter(
            tipo_movimiento="ENTRADA", fecha_hora__date=hoy
        ).count()
        solicitudes_pendientes = Usuario.objects.filter(is_active=False).count()
        accesos_denegados = RegistroAcceso.objects.filter(
            Q(tipo_movimiento="DENEGADO") | Q(motivo_apertura__icontains="RECHAZADO"),
            fecha_hora__date__gte=primer_dia_mes,
        ).count()

        return Response(
            {
                "total_vehiculos": total_vehiculos,
                "ingresos_hoy": ingresos_hoy,
                "solicitudes_pendientes": solicitudes_pendientes,
                "accesos_denegados": accesos_denegados,
            },
            status=status.HTTP_200_OK,
        )


class AprobarUsuarioView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, id_usuario):
        usuario = get_object_or_404(Usuario, id_usuario=id_usuario)
        usuario.is_active = True
        usuario.estado = True
        usuario.save()
        return Response({"message": "Usuario aprobado correctamente."}, status=status.HTTP_200_OK)

    def delete(self, request, id_usuario):
        usuario = get_object_or_404(Usuario, id_usuario=id_usuario)
        usuario.delete()
        return Response({"message": "Solicitud rechazada y eliminada."}, status=status.HTTP_200_OK)


class VehiculoListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vehiculos = Vehiculo.objects.filter(propietario=request.user, activo=True)
        serializer = VehiculoSerializer(vehiculos, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = VehiculoSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(propietario=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VehiculoDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_object(self, request, id_vehiculo):
        if request.user.rol in ["admin", "administrador"] or request.user.is_superuser:
            return get_object_or_404(Vehiculo, id_vehiculo=id_vehiculo)
        return get_object_or_404(Vehiculo, id_vehiculo=id_vehiculo, propietario=request.user)

    def patch(self, request, id_vehiculo):
        vehiculo = self._get_object(request, id_vehiculo)
        nueva_placa = request.data.get("placa")

        if nueva_placa:
            nueva_placa = nueva_placa.strip().upper()
            if Vehiculo.objects.filter(placa=nueva_placa, activo=True).exclude(id_vehiculo=id_vehiculo).exists():
                return Response(
                    {"error": f"La placa '{nueva_placa}' ya está asignada a otro vehículo activo."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = VehiculoSerializer(vehiculo, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, id_vehiculo):
        vehiculo = self._get_object(request, id_vehiculo)
        serializer = VehiculoSerializer(vehiculo, data=request.data, partial=False)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, id_vehiculo):
        vehiculo = self._get_object(request, id_vehiculo)
        vehiculo.activo = False
        vehiculo.save()
        return Response({"mensaje": "Vehículo eliminado correctamente."}, status=status.HTTP_200_OK)


class PerfilUsuarioView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request):
        serializer = UsuarioUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UsuarioListCreateView(generics.ListCreateAPIView):
    queryset = Usuario.objects.all()
    serializer_class = userSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return Usuario.objects.all().order_by('-fecha_registro' if hasattr(Usuario, 'fecha_registro') else 'id_usuario')


class UsuarioDetailUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Usuario.objects.all()
    serializer_class = userSerializer
    lookup_field = "id_usuario"
    permission_classes = [IsAdmin]

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Pasar el request en el context para que userSerializer.update acceda a request.data limpiamente
        serializer = self.get_serializer(instance, data=request.data, partial=partial, context={'request': request})
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, *args, **kwargs):
        kwargs['partial'] = False
        return self.update(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

class RegistroAccesoListCreateView(APIView):
    permission_classes = [IsSeguridadOrAdmin]

    def get(self, request):
        try:
            hoy = timezone.localtime(timezone.now()).date()

            ingresos_hoy = RegistroAcceso.objects.filter(
                tipo_movimiento="ENTRADA", fecha_hora__date=hoy
            ).count()

            salidas_hoy = RegistroAcceso.objects.filter(
                tipo_movimiento="SALIDA", fecha_hora__date=hoy
            ).count()

            vehiculos_dentro = max(0, ingresos_hoy - salidas_hoy)

            aperturas_manuales = RegistroAcceso.objects.filter(
                Q(tipo_movimiento="APERTURA_MANUAL") | Q(motivo_apertura__icontains="APERTURA MANUAL"),
                fecha_hora__date=hoy
            ).count()

            accesos_denegados = RegistroAcceso.objects.filter(
                Q(tipo_movimiento="DENEGADO") | Q(motivo_apertura__icontains="RECHAZADO"),
                fecha_hora__date=hoy
            ).count()

            registros = RegistroAcceso.objects.select_related(
                "vehiculo", "vehiculo__propietario", "vigilante"
            ).order_by("-fecha_hora")[:10]

            recientes = []
            for r in registros:
                placa = r.vehiculo.placa if r.vehiculo else (r.placa_manual or "S_PLACA")
                
                conductor = "Desconocido"
                if r.nombre_conductor_manual:
                    conductor = r.nombre_conductor_manual
                elif r.vehiculo and r.vehiculo.propietario:
                    conductor = r.vehiculo.propietario.nombre_completo

                fecha_ = timezone.localtime(r.fecha_hora) if r.fecha_hora else None
                hora_str = fecha_.strftime("%Y-%m-%d %H:%M:%S") if fecha_ else ""
                tipo_raw = (r.vehiculo.tipo_vehiculo if r.vehiculo else (r.tipo_vehiculo_manual or "AUTO")).upper()
                if tipo_raw in ["CARRO", "AUTOMOVIL", "AUTO"]:
                    tipo_vehiculo = "AUTO"
                elif tipo_raw in ["MOTO", "MOTOCICLETA"]:
                    tipo_vehiculo = "MOTO"
                elif tipo_raw in ["BICICLETA", "BICI"]:
                    tipo_vehiculo = "BICICLETA"
                elif tipo_raw in ["ELECTRICO", "ELECTR"]:
                    tipo_vehiculo = "ELECTRICO"
                elif tipo_raw in ["PATIN", "SCOOTER"]:
                    tipo_vehiculo = "PATIN"
                else:
                    tipo_vehiculo = "AUTO"

                recientes.append({
                    "id": r.id_registro,
                    "vehiculo": tipo_vehiculo,
                    "placa": placa,
                    "conductor": conductor,
                    "acreditacion": getattr(r.vigilante, "rol", "SEGURIDAD") if r.vigilante else "Automático",
                    "fecha_hora": hora_str,
                    "hora_fecha": hora_str,
                    "movimiento": r.tipo_movimiento
                })

            return Response({
                "ingresos_hoy": ingresos_hoy,
                "salidas_hoy": salidas_hoy,
                "vehiculos_dentro": vehiculos_dentro,
                "aperturas_manuales": aperturas_manuales,
                "accesos_denegados": accesos_denegados,
                "recientes": recientes
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        data = request.data.copy()
        
        tipo_mov = data.get("tipo_movimiento", "ENTRADA")
    
        placa_raw = data.get("placa_vehiculo_input") or data.get("placa_manual") or data.get("placa")
        tipo_raw = data.get("tipo_vehiculo_input") or data.get("tipo_vehiculo_manual") or data.get("tipo_vehiculo") or data.get("vehiculo")
        conductor_raw = data.get("nombre_conductor_input") or data.get("nombre_conductor_manual") or data.get("conductor")
        motivo_raw = data.get("motivo_input") or data.get("motivo_apertura")

        if tipo_mov == "REGISTRO_VISITANTE":
            data["tipo_movimiento"] = "ENTRADA"
            if not motivo_raw:
                motivo_raw = "INGRESO VISITANTE"
        elif tipo_mov == "APERTURA_MANUAL":
            data["tipo_movimiento"] = "APERTURA_MANUAL"
            if not motivo_raw:
                motivo_raw = "Apertura Manual Forzada en Portería"

        if placa_raw:
            data["placa_vehiculo_input"] = str(placa_raw).strip().upper()
        if tipo_raw:
            data["tipo_vehiculo_input"] = str(tipo_raw).strip().upper()
        if conductor_raw:
            data["nombre_conductor_input"] = str(conductor_raw).strip().upper()
        if motivo_raw:
            data["motivo_input"] = str(motivo_raw).strip()

        serializer = RegistroAccesoSerializer(data=data, context={"request": request})
        if serializer.is_valid():
            serializer.save(vigilante=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class InformeTurnoCreateView(APIView):
    permission_classes = [IsSeguridad]

    def post(self, request):
        fecha_inicio_str = request.data.get("fecha_hora_inicio")
        ahora_local = timezone.localtime(timezone.now())
        inicio_dia_local = ahora_local.replace(hour=0, minute=0, second=0, microsecond=0)

        if fecha_inicio_str:
            dt_parsed = parse_datetime(fecha_inicio_str)
            if dt_parsed:
                if timezone.is_naive(dt_parsed):
                    dt_parsed = timezone.make_aware(dt_parsed, timezone.get_current_timezone())
                dt_local = timezone.localtime(dt_parsed)
                fecha_hora_inicio = dt_local.replace(hour=0, minute=0, second=0, microsecond=0)
            else:
                fecha_hora_inicio = inicio_dia_local
        else:
            fecha_hora_inicio = inicio_dia_local

        novedades = request.data.get("novedades_observaciones", "")
        sin_novedad = request.data.get("entrega_sin_novedad", True)

        tipos_ingreso = ["ENTRADA", "APERTURA_MANUAL", "REGISTRO_VISITANTE"]

        total_entradas = RegistroAcceso.objects.filter(
            tipo_movimiento__in=tipos_ingreso,
            fecha_hora__gte=fecha_hora_inicio
        ).count()

        total_salidas = RegistroAcceso.objects.filter(
            tipo_movimiento="SALIDA",
            fecha_hora__gte=fecha_hora_inicio
        ).count()

        vehiculos_quedados = max(0, total_entradas - total_salidas)

        informe = InformeTurno.objects.create(
            vigilante=request.user,
            fecha_hora_inicio=fecha_hora_inicio,
            fecha_hora_fin=timezone.now(),
            total_entradas=total_entradas,
            total_salidas=total_salidas,
            vehiculos_quedados=vehiculos_quedados,
            novedades_observaciones=novedades,
            entrega_sin_novedad=sin_novedad,
        )

        return Response(
            {
                "message": "Informe de turno generado con éxito",
                "id_informe": informe.pk,
                "total_entradas": total_entradas,
                "vehiculos_quedados": vehiculos_quedados,
            },
            status=status.HTTP_201_CREATED,
        )

    
class MisRegistrosAccesoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        placas_usuario = request.user.vehiculos.filter(activo=True).values_list('placa', flat=True)
        filtro_usuario = Q(usuario=request.user) if hasattr(RegistroAcceso, 'usuario') else Q()

        accesos = RegistroAcceso.objects.filter(
            filtro_usuario |
            Q(vehiculo__propietario=request.user) |
            Q(placa_manual__in=placas_usuario) |
            Q(nombre_conductor_manual__icontains=request.user.nombre_completo)
        ).select_related("vehiculo").order_by("-fecha_hora").distinct()

        serializer = RegistroAccesoSerializer(accesos, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CambiarPasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        password_actual = request.data.get("password_actual")
        password_nueva = request.data.get("password_nueva")

        if not password_actual or not password_nueva:
            return Response(
                {"error": "Todos los campos son obligatorios."},
                status=status.HTTP_400_BAD_REQUEST,
            )
            
        if not check_password(password_actual, user.password):
            return Response(
                {"error": "La contraseña actual es incorrecta."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if hasattr(user, 'estado') and isinstance(user.estado, str):
            user.estado = user.estado.lower() in ['true', '1', 'activo']
        if isinstance(user.is_active, str):
            user.is_active = user.is_active.lower() in ['true', '1', 'activo']

        user.set_password(password_nueva)
        user.save(update_fields=['password'])
        
        return Response({"message": "Contraseña actualizada con éxito."}, status=status.HTTP_200_OK)


class RegistrarBiometriaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        vector_biometrico = request.data.get("vector_biometrico")
        id_usuario = request.data.get("usuario_id")

        if not vector_biometrico or not isinstance(vector_biometrico, list):
            return Response(
                {"error": "Se requiere un vector biométrico válido (array de 128 valores)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if id_usuario and (request.user.rol in ["admin", "administrador"] or request.user.is_superuser):
            target_user = get_object_or_404(Usuario, id_usuario=id_usuario)
        else:
            target_user = request.user

        vector_json = json.dumps(vector_biometrico)
        biometria, created = BiometriaUsuario.objects.update_or_create(
            usuario=target_user, defaults={"vector_facial": vector_json, "activo": True}
        )

        mensaje = "Rostro registrado exitosamente." if created else "Rostro actualizado exitosamente."
        return Response(
            {"mensaje": mensaje},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class ValidarPlacaBiometriaView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, placa):
        vehiculo = (
            Vehiculo.objects.filter(placa__iexact=placa, activo=True)
            .select_related("propietario")
            .first()
        )

        if not vehiculo:
            return Response(
                {"autorizado": False, "mensaje": "Vehículo no encontrado o inactivo"},
                status=status.HTTP_404_NOT_FOUND,
            )

        propietario = vehiculo.propietario
        descriptor = None
        try:
            biometria = BiometriaUsuario.objects.get(usuario=propietario, activo=True)
            descriptor = biometria.get_descriptor() if hasattr(biometria, 'get_descriptor') else json.loads(biometria.vector_facial)
        except BiometriaUsuario.DoesNotExist:
            pass

        return Response(
            {
                "autorizado": True,
                "vehiculo": {
                    "id_vehiculo": str(vehiculo.id_vehiculo),
                    "placa": vehiculo.placa,
                    "tipo": getattr(vehiculo, "tipo_vehiculo", getattr(vehiculo, "tipoVehiculo", "AUTOMOVIL")),
                },
                "usuario": {
                    "id_usuario": str(propietario.id_usuario),
                    "nombre_completo": propietario.nombre_completo,
                    "ficha": getattr(propietario, "ficha", None),
                    "tiene_biometria": descriptor is not None,
                    "descriptor_facial": descriptor,
                },
            },
            status=status.HTTP_200_OK,
        )


class ValidarAccesoPorteriaView(APIView):
    permission_classes = [IsSeguridadOrAdmin]

    def post(self, request):
        placa = request.data.get("placa")
        vector_capturado = request.data.get("vector_biometrico")
        tipo_movimiento = str(request.data.get("tipo_movimiento", "ENTRADA")).strip().upper()
        id_usuario_forzado = request.data.get("id_usuario")

        if not vector_capturado or not isinstance(vector_capturado, list):
            return Response(
                {"mensaje": "Se requiere captura biométrica facial válida."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        usuario_identificado = None
        vehiculo_obj = None
        UMBRAL = 0.60
        vec_input = np.array(vector_capturado, dtype=np.float32).flatten()
        if placa and str(placa).strip().upper() not in ["N/A", "S_PLACA", "SIN_PLACA", ""]:
            placa_clean = str(placa).strip().replace('-', '').replace(' ', '').upper()
            
            vehiculo_obj = Vehiculo.objects.annotate(
                placa_sin_guion=Replace('placa', Value('-'), Value(''))
            ).filter(placa_sin_guion=placa_clean, activo=True).first()

            if not vehiculo_obj:
                return Response(
                    {"mensaje": f"El vehículo con placa '{placa}' no se encuentra registrado en el sistema."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            usuario_identificado = vehiculo_obj.propietario

        if id_usuario_forzado:
            usuario_identificado = get_object_or_404(Usuario, pk=id_usuario_forzado)
            if not vehiculo_obj and hasattr(usuario_identificado, 'vehiculos'):
                vehiculo_obj = usuario_identificado.vehiculos.filter(activo=True).first()

        elif not usuario_identificado:
            biometrias = BiometriaUsuario.objects.select_related("usuario").filter(
                activo=True, usuario__is_active=True
            )

            coincidencias = []
            for bio in biometrias:
                estado_usr = str(getattr(bio.usuario, 'estado', '')).strip().lower()
                if estado_usr not in ['activo', 'true', '1']:
                    continue

                descriptor = bio.get_descriptor() if hasattr(bio, 'get_descriptor') else json.loads(bio.vector_facial)
                if not descriptor:
                    continue

                vec_guardado = np.array(descriptor, dtype=np.float32).flatten()
                if vec_guardado.shape == vec_input.shape:
                    dist = np.linalg.norm(vec_guardado - vec_input)
                    if dist <= UMBRAL:
                        coincidencias.append({"usuario": bio.usuario, "distancia": dist})

            coincidencias.sort(key=lambda x: x["distancia"])

            if len(coincidencias) > 1:
                cuentas = []
                for c in coincidencias:
                    usr = c["usuario"]
                    vehiculos = usr.vehiculos.filter(activo=True) if hasattr(usr, 'vehiculos') else []
                    if vehiculos:
                        for v in vehiculos:
                            cuentas.append({
                                "id_usuario": usr.id_usuario,
                                "id_vehiculo": v.id_vehiculo,
                                "nombre": usr.nombre_completo,
                                "correo": usr.correo,
                                "rol": getattr(usr, "rol", "Aprendiz"),
                                "ficha": getattr(usr, "ficha", None),
                                "placa": v.placa
                            })
                    else:
                        cuentas.append({
                            "id_usuario": usr.id_usuario,
                            "id_vehiculo": None,
                            "nombre": usr.nombre_completo,
                            "correo": usr.correo,
                            "rol": getattr(usr, "rol", "Aprendiz"),
                            "ficha": getattr(usr, "ficha", None),
                            "placa": "S_PLACA"
                        })

                return Response(
                    {
                        "multiple_matches": True,
                        "mensaje": "Múltiples coincidencias biométricas detectadas. Selecciona el usuario correspondiente.",
                        "cuentas": cuentas,
                    },
                    status=status.HTTP_300_MULTIPLE_CHOICES,
                )
            elif len(coincidencias) == 1:
                usr = coincidencias[0]["usuario"]
                vehiculos = usr.vehiculos.filter(activo=True) if hasattr(usr, 'vehiculos') else []
                if not vehiculo_obj and len(vehiculos) > 1:
                    cuentas = []
                    for v in vehiculos:
                        cuentas.append({
                            "id_usuario": usr.id_usuario,
                            "id_vehiculo": v.id_vehiculo,
                            "nombre": usr.nombre_completo,
                            "correo": usr.correo,
                            "rol": getattr(usr, "rol", "Aprendiz"),
                            "ficha": getattr(usr, "ficha", None),
                            "placa": v.placa
                        })
                    return Response(
                        {
                            "multiple_matches": True,
                            "mensaje": "El usuario tiene múltiples vehículos. Selecciona con cuál va a ingresar.",
                            "cuentas": cuentas,
                        },
                        status=status.HTTP_300_MULTIPLE_CHOICES,
                    )
                else:
                    usuario_identificado = usr
                    if not vehiculo_obj and vehiculos:
                        vehiculo_obj = vehiculos.first()
            else:
                return Response(
                    {"mensaje": "Rostro no reconocido en la base de datos."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
        else:
            try:
                biometria = BiometriaUsuario.objects.get(usuario=usuario_identificado, activo=True)
                descriptor = biometria.get_descriptor() if hasattr(biometria, 'get_descriptor') else json.loads(biometria.vector_facial)
                if not descriptor:
                    raise BiometriaUsuario.DoesNotExist

                vec_guardado = np.array(descriptor, dtype=np.float32).flatten()
                distancia = np.linalg.norm(vec_guardado - vec_input)

                if distancia > UMBRAL:
                    return Response(
                        {"mensaje": f"Sustitución detectada: El conductor enfocado no coincide con el propietario del vehículo ({placa})."},
                        status=status.HTTP_401_UNAUTHORIZED,
                    )
            except BiometriaUsuario.DoesNotExist:
                return Response(
                    {"mensaje": "El propietario del vehículo no posee biometría registrada."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if not usuario_identificado.is_active or not getattr(usuario_identificado, 'estado', True):
            return Response(
                {"mensaje": "Usuario inactivo o pendiente de aprobación por administración."},
                status=status.HTTP_403_FORBIDDEN,
            )

        placa_evaluar = vehiculo_obj.placa if vehiculo_obj else (placa if placa else "S_PLACA")
        
        ultimo_registro_usuario = RegistroAcceso.objects.filter(usuario=usuario_identificado).exclude(
            tipo_movimiento="DENEGADO"
        ).order_by("-fecha_hora").first()

        ultimo_registro_vehiculo = None
        if vehiculo_obj:
            ultimo_registro_vehiculo = RegistroAcceso.objects.filter(vehiculo=vehiculo_obj).exclude(
                tipo_movimiento="DENEGADO"
            ).order_by("-fecha_hora").first()
        elif placa_evaluar not in ["S_PLACA", "N/A", ""]:
            placa_c = placa_evaluar.replace('-', '').upper()
            ultimo_registro_vehiculo = RegistroAcceso.objects.filter(placa_manual=placa_c).exclude(
                tipo_movimiento="DENEGADO"
            ).order_by("-fecha_hora").first()

        if tipo_movimiento == "SALIDA":
            if ultimo_registro_vehiculo and ultimo_registro_vehiculo.tipo_movimiento not in ["ENTRADA", "APERTURA_MANUAL"]:
                return Response(
                    {"mensaje": f"Validación rechazada: El vehículo {placa_evaluar} no registra un ingreso previo activo en las instalaciones."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not ultimo_registro_vehiculo and (not ultimo_registro_usuario or ultimo_registro_usuario.tipo_movimiento not in ["ENTRADA", "APERTURA_MANUAL"]):
                return Response(
                    {"mensaje": f"Validación rechazada: '{usuario_identificado.nombre_completo}' no registra un ingreso previo activo en las instalaciones."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        elif tipo_movimiento == "ENTRADA":
            if ultimo_registro_usuario and ultimo_registro_usuario.tipo_movimiento in ["ENTRADA", "APERTURA_MANUAL"]:
                return Response(
                    {"mensaje": f"Validación rechazada: '{usuario_identificado.nombre_completo}' ya figura con un ingreso registrado dentro del recinto."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if ultimo_registro_vehiculo and ultimo_registro_vehiculo.tipo_movimiento in ["ENTRADA", "APERTURA_MANUAL"]:
                return Response(
                    {"mensaje": f"Validación rechazada: El vehículo {placa_evaluar} ya figura con un ingreso registrado dentro del recinto."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        kwargs_registro = {
            "vehiculo": vehiculo_obj,
            "placa_manual": None if vehiculo_obj else (placa if placa else "S_PLACA"),
            "nombre_conductor_manual": usuario_identificado.nombre_completo,
            "tipo_movimiento": tipo_movimiento,
            "vigilante": request.user,
            "fecha_hora": timezone.now(),
        }
        if hasattr(RegistroAcceso, 'usuario'):
            kwargs_registro["usuario"] = usuario_identificado

        registro = RegistroAcceso.objects.create(**kwargs_registro)

        return Response(
            {
                "mensaje": f"Acceso concedido [{tipo_movimiento}]",
                "usuario": {
                    "nombre": usuario_identificado.nombre_completo,
                    "rol": getattr(usuario_identificado, "rol", "Aprendiz"),
                    "correo": usuario_identificado.correo,
                    "ficha": getattr(usuario_identificado, "ficha", None),
                },
                "vehiculo": vehiculo_obj.placa if vehiculo_obj else "S_PLACA",
                "hora": timezone.localtime(registro.fecha_hora).strftime("%H:%M:%S"),
            },
            status=status.HTTP_200_OK,
        )
class LoginBiometricoView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        vector_capturado = request.data.get("vector_biometrico")
        id_usuario_seleccionado = request.data.get("id_usuario")
        password = request.data.get("password")

        if id_usuario_seleccionado and password:
            user = get_object_or_404(Usuario, pk=id_usuario_seleccionado, is_active=True, estado=True)
            if check_password(password, user.password):
                refresh = RefreshToken.for_user(user)
                return Response(
                    {
                        "multiple_matches": False,
                        "mensaje": f"¡Bienvenido de nuevo, {user.nombre_completo}!",
                        "access": str(refresh.access_token),
                        "refresh": str(refresh),
                        "usuario": userSerializer(user).data,
                    },
                    status=status.HTTP_200_OK,
                )
            return Response(
                {"error": "Contraseña incorrecta para la cuenta seleccionada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not vector_capturado or not isinstance(vector_capturado, list):
            return Response(
                {"error": "Se requiere un vector biométrico válido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        vec_input = np.array(vector_capturado, dtype=np.float32).flatten()
        biometrias = BiometriaUsuario.objects.select_related("usuario").filter(
            activo=True,
            usuario__is_active=True
        )

        biometrias_validas = []
        for bio in biometrias:
            estado_str = str(getattr(bio.usuario, 'estado', '')).strip().lower()
            if estado_str in ['activo', 'true', '1']:
                biometrias_validas.append(bio)

        UMBRAL_TOLERANCIA = 0.60
        coincidencias = []

        for bio in biometrias_validas:
            vec_guardado_list = bio.get_descriptor() if hasattr(bio, 'get_descriptor') else json.loads(bio.vector_facial)
            if not vec_guardado_list:
                continue

            try:
                vec_guardado = np.array(vec_guardado_list, dtype=np.float32).flatten()
                if vec_guardado.shape == vec_input.shape:
                    dist = np.linalg.norm(vec_guardado - vec_input)
                    if dist <= UMBRAL_TOLERANCIA:
                        coincidencias.append({"usuario": bio.usuario, "distancia": dist})
            except Exception:
                continue

        coincidencias.sort(key=lambda x: x["distancia"])

        if len(coincidencias) > 1:
            cuentas = [
                {
                    "id_usuario": c["usuario"].id_usuario,
                    "nombre": c["usuario"].nombre_completo,
                    "correo": c["usuario"].correo,
                    "rol": getattr(c["usuario"], "rol", "Aprendiz"),
                    "ficha": getattr(c["usuario"], "ficha", None),
                    "distancia": round(float(c["distancia"]), 4),
                }
                for c in coincidencias
            ]
            return Response(
                {
                    "multiple_matches": True,
                    "mensaje": "Se encontraron múltiples coincidencias biométricas. Por favor selecciona tu cuenta e ingresa tu contraseña.",
                    "cuentas": cuentas,
                },
                status=status.HTTP_300_MULTIPLE_CHOICES,
            )

        elif len(coincidencias) == 1:
            user = coincidencias[0]["usuario"]
            refresh = RefreshToken.for_user(user)
            return Response(
                {
                    "multiple_matches": False,
                    "mensaje": f"¡Bienvenido de nuevo, {user.nombre_completo}!",
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                    "usuario": userSerializer(user).data,
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {"error": "Rostro no reconocido. Utiliza tu correo y contraseña o vuelve a intentarlo."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

class DashboardAccesosView(APIView):
    permission_classes = [IsSeguridadOrAdmin]

    def get(self, request):
        try:
            hoy = timezone.localtime(timezone.now()).date()

            ingresos_hoy = RegistroAcceso.objects.filter(
                tipo_movimiento="ENTRADA", fecha_hora__date=hoy
            ).count()
            
            salidas_hoy = RegistroAcceso.objects.filter(
                tipo_movimiento="SALIDA", fecha_hora__date=hoy
            ).count()

            vehiculos_dentro = max(0, ingresos_hoy - salidas_hoy)

            aperturas_manuales = RegistroAcceso.objects.filter(
                motivo_apertura__isnull=False, fecha_hora__date=hoy
            ).exclude(motivo_apertura="").count()

            accesos_denegados = RegistroAcceso.objects.filter(
                Q(tipo_movimiento="DENEGADO") | Q(motivo_apertura__icontains="RECHAZADO"),
                fecha_hora__date=hoy
            ).count()

            registros_recientes = RegistroAcceso.objects.select_related(
                "vehiculo", "usuario", "vigilante"
            ).order_by("-fecha_hora")[:10]

            movimientos = []
            for r in registros_recientes:
                fecha = timezone.localtime(r.fecha_hora) if r.fecha_hora else None
                hora_fecha_str = fecha.strftime("%Y-%m-%d %H:%M:%S") if fecha else ""
                tipo_vehiculo = (
                    getattr(r.vehiculo, "tipo_vehiculo", None) or 
                    getattr(r.vehiculo, "tipo", None) or 
                    getattr(r, "tipo_vehiculo_manual", None) or 
                    "AUTOMOVIL"
                )

                movimientos.append({
                    "id": r.id_registro if hasattr(r, 'id_registro') else r.pk,
                    "vehiculo": tipo_vehiculo.upper(),
                    "placa": r.vehiculo.placa if r.vehiculo else (r.placa_manual or "S_PLACA"),
                    "conductor": r.nombre_conductor_manual or (r.usuario.nombre_completo if hasattr(r, 'usuario') and r.usuario else "Desconocido"),
                    "acreditacion": getattr(r.usuario, "rol", "Visitante/Estándar") if hasattr(r, 'usuario') and r.usuario else "Visitante",
                    "hora_fecha": hora_fecha_str,
                    "movimiento": r.tipo_movimiento
                })

            return Response({
                "ingresos_hoy": ingresos_hoy,
                "salidas_hoy": salidas_hoy,
                "vehiculos_dentro": vehiculos_dentro,
                "aperturas_manuales": aperturas_manuales,
                "accesos_denegados": accesos_denegados,
                "recientes": movimientos
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
class InformeTurnoListView(generics.ListAPIView):
    queryset = InformeTurno.objects.all().order_by('-fecha_hora_fin')
    serializer_class = InformeTurnoSerializer
    permission_classes = [IsAdmin]
