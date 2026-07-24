import json
import numpy as np

from django.contrib.auth.hashers import check_password
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone

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
)


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            with transaction.atomic():
                user = serializer.save()

            return Response(
                {
                    "mensaje": "Usuario registrado exitosamente. Esperando aprobación del administrador.",
                    "usuario": {
                        "id_usuario": user.id_usuario,
                        "nombre_completo": user.nombre_completo,
                        "correo": user.correo,
                        "rol": user.rol,
                        "estado": user.estado,
                    },
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
        if not user.is_active:
            return Response(
                {
                    "error": "Cuenta inactiva. El administrador aún no ha aprobado tu registro."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        vector_recibido = request.data.get("vector_biometrico")

        if vector_recibido:
            try:
                biometria = BiometriaUsuario.objects.get(usuario=user)
                vector_guardado = np.array(json.loads(biometria.vector_facial))
                vec_input = np.array(vector_recibido)
                distancia = np.linalg.norm(vector_guardado - vec_input)
                UMBRAL_TOLERANCIA = 0.6

                if distancia > UMBRAL_TOLERANCIA:
                    return Response(
                        {
                            "error": f"Verificación facial fallida. Rostro no coincide con la cuenta (Distancia: {distancia:.2f})."
                        },
                        status=status.HTTP_401_UNAUTHORIZED,
                    )

            except BiometriaUsuario.DoesNotExist:
                return Response(
                    {
                        "error": "No tienes un registro biométrico en el sistema. Contacta al administrador."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Generación de Tokens JWT
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
        return Response(serializer.data)


class AdminDashboardStatsView(APIView):
    permission_classes = [IsSeguridadOrAdmin]

    def get(self, request):
        hoy = timezone.now().date()

        total_vehiculos = Vehiculo.objects.count()
        ingresos_hoy = RegistroAcceso.objects.filter(
            tipo_movimiento="ENTRADA", fecha_hora__date=hoy
        ).count()
        solicitudes_pendientes = Usuario.objects.filter(
            is_active=False
        ).count()
        primer_dia_mes = hoy.replace(day=1)
        accesos_denegados = RegistroAcceso.objects.filter(
            Q(tipo_movimiento="DENUR_O_FALLA")
            | Q(motivo_apertura__icontains="RECHAZADO"),
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
        try:
            usuario = Usuario.objects.get(id_usuario=id_usuario)
            usuario.is_active = True
            usuario.save()
            return Response(
                {"message": "Usuario aprobado"}, status=status.HTTP_200_OK
            )
        except Usuario.DoesNotExist:
            return Response(
                {"error": "No encontrado"}, status=status.HTTP_404_NOT_FOUND
            )

    def delete(self, request, id_usuario):
        try:
            usuario = Usuario.objects.get(id_usuario=id_usuario)
            usuario.delete()
            return Response(
                {"message": "Solicitud rechazada y eliminada"},
                status=status.HTTP_200_OK,
            )
        except Usuario.DoesNotExist:
            return Response(
                {"error": "Usuario no encontrado"},
                status=status.HTTP_404_NOT_FOUND,
            )


class VehiculoListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vehiculos = Vehiculo.objects.filter(propietario=request.user)
        serializer = VehiculoSerializer(vehiculos, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = VehiculoSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(propietario=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VehiculoDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, id_vehiculo):
        try:
            if (
                request.user.rol in ["admin", "administrador"]
                or request.user.is_superuser
            ):
                vehiculo = Vehiculo.objects.get(id_vehiculo=id_vehiculo)
            else:
                vehiculo = Vehiculo.objects.get(
                    id_vehiculo=id_vehiculo, propietario=request.user
                )

            nueva_placa = request.data.get("placa")
            if nueva_placa:
                nueva_placa = nueva_placa.strip().upper()
                placa_existe = (
                    Vehiculo.objects.filter(placa=nueva_placa)
                    .exclude(id_vehiculo=id_vehiculo)
                    .exists()
                )

                if placa_existe:
                    return Response(
                        {
                            "error": f"La placa '{nueva_placa}' ya está asignada a otro conductor en el sistema."
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            serializer = VehiculoSerializer(
                vehiculo, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(
                serializer.errors, status=status.HTTP_400_BAD_REQUEST
            )

        except Vehiculo.DoesNotExist:
            return Response(
                {"error": "Vehículo no encontrado o no autorizado"},
                status=status.HTTP_404_NOT_FOUND,
            )

    def put(self, request, id_vehiculo):
        return self.patch(request, id_vehiculo)


class PerfilUsuarioView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request):
        serializer = userSerializer(
            request.user, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UsuarioListCreateView(generics.ListCreateAPIView):
    queryset = Usuario.objects.all()
    serializer_class = userSerializer
    permission_classes = [permissions.IsAuthenticated]


class UsuarioDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Usuario.objects.all()
    serializer_class = userSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "id_usuario"


class RegistroAccesoListCreateView(APIView):
    permission_classes = [IsSeguridadOrAdmin]

    def get(self, request):
        if request.user.rol != "seguridad" and request.user.rol != "admin":
            raise PermissionDenied(
                "No tienes permisos para consultar este historial."
            )
        registros = RegistroAcceso.objects.all().order_by("-fecha_hora")[:100]
        serializer = RegistroAccesoSerializer(registros, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        if request.user.rol != "seguridad":
            raise PermissionDenied(
                "Solo el personal de seguridad puede registrar accesos."
            )

        data = request.data.copy()
        tipo_original = data.get("tipo_movimiento")

        if tipo_original == "APERTURA_MANUAL":
            data["tipo_movimiento"] = "APERTURA_MANUAL"

        elif tipo_original == "REGISTRO_VISITANTE":
            data["tipo_movimiento"] = "ENTRADA"
            if not data.get("motivo_input"):
                data["motivo_input"] = "INGRESO VISITANTE"

        serializer = RegistroAccesoSerializer(
            data=data, context={"request": request}
        )

        if serializer.is_valid():
            serializer.save(vigilante=request.user)
            return Response(
                serializer.data, status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class InformeTurnoCreateView(APIView):
    permission_classes = [IsSeguridad]

    def post(self, request):
        if request.user.rol != "seguridad":
            raise PermissionDenied(
                "No tienes permisos para generar informes de turno."
            )

        data = request.data
        fecha_hora_inicio = data.get("fecha_hora_inicio")
        novedades = data.get("novedades_observaciones", "")
        sin_novedad = data.get("entrega_sin_novedad", True)

        total_entradas = RegistroAcceso.objects.filter(
            vigilante=request.user,
            tipo_movimiento="ENTRADA",
            fecha_hora__gte=fecha_hora_inicio,
        ).count()

        total_salidas = RegistroAcceso.objects.filter(
            vigilante=request.user,
            tipo_movimiento="SALIDA",
            fecha_hora__gte=fecha_hora_inicio,
        ).count()

        vehiculos_quedados = max(0, total_entradas - total_salidas)

        informe = InformeTurno.objects.create(
            vigilante=request.user,
            fecha_hora_inicio=fecha_hora_inicio,
            fecha_hora_fin=timezone.now(),
            novedades_observaciones=novedades,
            entrega_sin_novedad=sin_novedad,
        )

        return Response(
            {
                "message": "Informe de turno generado con éxito",
                "total_entradas": total_entradas,
                "vehiculos_quedados": vehiculos_quedados,
            },
            status=status.HTTP_201_CREATED,
        )


class MisRegistrosAccesoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            accesos = RegistroAcceso.objects.filter(
                vehiculo__propietario=request.user
            ).order_by("-fecha_hora")
            serializer = RegistroAccesoSerializer(accesos, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": "Error interno en el servidor", "detalle": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


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

        user.set_password(password_nueva)
        user.save()
        return Response(
            {"message": "Contraseña actualizada con éxito."},
            status=status.HTTP_200_OK,
        )


class UsuarioDetailUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Usuario.objects.all()
    serializer_class = userSerializer
    lookup_field = "id_usuario"
    permission_classes = [IsAdmin]

    def patch(self, request, *args, **kwargs):
        try:
            usuario = self.get_object()
        except Usuario.DoesNotExist:
            return Response(
                {"error": "Usuario no encontrado"},
                status=status.HTTP_404_NOT_FOUND,
            )

        nuevo_estado = request.data.get("estado")
        nuevo_rol = request.data.get("rol")

        if nuevo_estado:
            usuario.estado = nuevo_estado
            if nuevo_estado == "activo":
                usuario.is_active = True
            elif nuevo_estado in ["pendiente", "inactivo"]:
                usuario.is_active = False

        if nuevo_rol:
            usuario.rol = nuevo_rol
            if nuevo_rol == "admin":
                usuario.is_admin = True
                usuario.is_staff = True

        usuario.save()
        serializer = self.get_serializer(usuario)
        return Response(serializer.data, status=status.HTTP_200_OK)


class EnrolarBiometriaView(APIView):
    """
    Guarda o actualiza el vector biométrico facial de un usuario.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        id_usuario = request.data.get("id_usuario")
        descriptor = request.data.get("descriptor")

        if not id_usuario or not descriptor:
            return Response(
                {"error": "Se requiere id_usuario y el descriptor biométrico"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        usuario = get_object_or_404(Usuario, id_usuario=id_usuario)
        biometria, created = BiometriaUsuario.objects.get_or_create(
            usuario=usuario
        )
        biometria.set_descriptor(descriptor)
        biometria.save()

        return Response(
            {
                "mensaje": "Biometría registrada exitosamente",
                "id_usuario": str(usuario.id_usuario),
                "actualizado": not created,
            },
            status=status.HTTP_200_OK,
        )


class ValidarPlacaBiometriaView(APIView):
    """
    Dado el texto de una placa, retorna los datos del vehículo y
    el vector biométrico del dueño para ser validado en la entrada.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, placa):
        vehiculo = (
            Vehiculo.objects.filter(placa__iexact=placa, activo=True)
            .select_related("propietario")
            .first()
        )

        if not vehiculo:
            return Response(
                {
                    "autorizado": False,
                    "mensaje": "Vehículo no encontrado o inactivo",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        propietario = vehiculo.propietario
        try:
            biometria = propietario.biometria
            if not biometria.activo:
                raise BiometriaUsuario.DoesNotExist
            descriptor = biometria.get_descriptor()
        except (BiometriaUsuario.DoesNotExist, AttributeError):
            descriptor = None

        return Response(
            {
                "autorizado": True,
                "vehiculo": {
                    "id_vehiculo": str(vehiculo.id_vehiculo),
                    "placa": vehiculo.placa,
                    "tipo": vehiculo.tipoVehiculo,
                },
                "usuario": {
                    "id_usuario": str(propietario.id_usuario),
                    "nombre_completo": propietario.nombre_completo,
                    "tiene_biometria": descriptor is not None,
                    "descriptor_facial": descriptor,
                },
            },
            status=status.HTTP_200_OK,
        )


class RegistrarBiometriaView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user = request.user if request.user.is_authenticated else None
        vector_biometrico = request.data.get("vector_biometrico")
        id_usuario = request.data.get("usuario_id")

        if not vector_biometrico or not isinstance(vector_biometrico, list):
            return Response(
                {
                    "error": "Se requiere un vector biométrico válido (array de 128 valores)."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user and id_usuario:
            user = get_object_or_404(Usuario, id_usuario=id_usuario)

        if not user:
            return Response(
                {"error": "Se requiere autenticación o id_usuario válido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        vector_json = json.dumps(vector_biometrico)
        biometria, created = BiometriaUsuario.objects.update_or_create(
            usuario=user, defaults={"vector_facial": vector_json}
        )

        mensaje = (
            "Rostro registrado exitosamente."
            if created
            else "Rostro actualizado exitosamente."
        )

        return Response(
            {"mensaje": mensaje},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class ValidarAccesoPorteriaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        placa = request.data.get("placa")
        vector_capturado = request.data.get("vector_biometrico")
        tipo_movimiento = request.data.get("tipo_movimiento", "ENTRADA")

        if not vector_capturado:
            return Response(
                {
                    "acceso_permitido": False,
                    "mensaje": "Se requiere captura biométrica facial.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        usuario_identificado = None
        vehiculo_obj = None

        if placa and placa.upper() != "N/A":
            try:
                vehiculo_obj = Vehiculo.objects.get(
                    placa=placa.upper().strip()
                )
                usuario_identificado = vehiculo_obj.usuario
            except Vehiculo.DoesNotExist:
                return Response(
                    {
                        "acceso_permitido": False,
                        "mensaje": f"Vehículo con placa {placa} no está registrado en el sistema.",
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

        if not usuario_identificado:
            biometrias = BiometriaUsuario.objects.all()
            vec_input = np.array(vector_capturado)
            mejor_coincidencia = None
            distancia_minima = 999.0

            for bio in biometrias:
                vec_guardado = np.array(json.loads(bio.vector_facial))
                dist = np.linalg.norm(vec_guardado - vec_input)
                if dist < distancia_minima:
                    distancia_minima = dist
                    mejor_coincidencia = bio.usuario

            UMBRAL = 0.55
            if distancia_minima <= UMBRAL and mejor_coincidencia:
                usuario_identificado = mejor_coincidencia
            else:
                return Response(
                    {
                        "acceso_permitido": False,
                        "mensaje": "Rostro no reconocido en el sistema.",
                    },
                    status=status.HTTP_401_UNAUTHORIZED,
                )
        else:
            try:
                biometria = BiometriaUsuario.objects.get(
                    usuario=usuario_identificado
                )
                vec_guardado = np.array(json.loads(biometria.vector_facial))
                vec_input = np.array(vector_capturado)

                distancia = np.linalg.norm(vec_guardado - vec_input)
                UMBRAL = 0.55

                if distancia > UMBRAL:
                    return Response(
                        {
                            "acceso_permitido": False,
                            "mensaje": f"Sustitución detectada: El conductor no coincide con el registrado para la placa {placa}.",
                        },
                        status=status.HTTP_401_UNAUTHORIZED,
                    )

            except BiometriaUsuario.DoesNotExist:
                return Response(
                    {
                        "acceso_permitido": False,
                        "mensaje": "El propietario del vehículo no posee biometría registrada.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if not usuario_identificado.is_active:
            return Response(
                {
                    "acceso_permitido": False,
                    "mensaje": "Usuario inactivo o pendiente de aprobación por administración.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        registro = RegistroAcceso.objects.create(
            usuario=usuario_identificado,
            vehiculo=vehiculo_obj,
            tipo_movimiento=tipo_movimiento,
            vigilante=request.user,
            fecha_hora=timezone.now(),
        )

        return Response(
            {
                "acceso_permitido": True,
                "mensaje": f"Acceso concedido. [{tipo_movimiento}]",
                "usuario": {
                    "nombre": f"{usuario_identificado.first_name} {usuario_identificado.last_name}",
                    "rol": getattr(usuario_identificado, "rol", "Aprendiz"),
                    "correo": usuario_identificado.email,
                },
                "vehiculo": vehiculo_obj.placa if vehiculo_obj else "Peatonal",
                "hora": registro.fecha_hora.strftime("%H:%M:%S"),
            },
            status=status.HTTP_200_OK,
        )