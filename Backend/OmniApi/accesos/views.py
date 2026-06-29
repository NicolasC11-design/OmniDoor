from rest_framework.views import APIView
from rest_framework.response import Response  
from rest_framework import status, permissions, generics
from rest_framework_simplejwt.tokens import RefreshToken  
from .serializers import (
    RegisterSerializer, userSerializer, LoginSerializer, VehiculoSerializer, 
    RegistroAccesoSerializer, InformeTurnoSerializer
)
from django.contrib.auth.models import BaseUserManager
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import Usuario, Vehiculo, RegistroAcceso, InformeTurno
from django.utils import timezone
from .permissions import IsSeguridad, IsAdmin
from django.contrib.auth.hashers import check_password

class RegisterView(APIView):
    permission_classes = [AllowAny] 

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            user = serializer.save()
            return Response({
                "mensaje": "Usuario registrado exitosamente. Esperando aprobación del administrador.",
                "usuario": userSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({"error": "Credenciales incorrectas."}, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data['user']

        if not user.is_active:
            return Response({
                "error": "Cuenta inactiva. El administrador aún no ha aprobado tu registro."
            }, status=status.HTTP_403_FORBIDDEN)

        refresh = RefreshToken.for_user(user)

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "usuario": userSerializer(user).data  
        }, status=status.HTTP_200_OK)

class AdminGestionCuentasView(APIView):
    permission_classes = [IsAdmin] 

    def get(self, request):
        usuarios_pendientes = Usuario.objects.filter(is_active=False)
        serializer = userSerializer(usuarios_pendientes, many=True)
        return Response(serializer.data)
    
class UsuarioManager(BaseUserManager):
    def create_user(self, correo, password=None, **extra_fields):
        if not correo:
            raise ValueError('El correo es obligatorio')
        correo = self.normalize_email(correo)
        usuario = self.model(correo=correo, **extra_fields)
        usuario.set_password(password)
        usuario.save(using=self._db)
        return usuario

    def create_superuser(self, correo, password=None, **extra_fields):
        extra_fields.setdefault('is_admin', True)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('rol', 'admin')

        return self.create_user(correo, password, **extra_fields)

class AprobarUsuarioView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, id_usuario):
        try:
            usuario = Usuario.objects.get(id_usuario=id_usuario)
            usuario.is_active = True 
            usuario.save()
            return Response({"message": "Usuario aprobado"}, status=status.HTTP_200_OK)
        except Usuario.DoesNotExist:
            return Response({"error": "No encontrado"}, status=status.HTTP_404_NOT_FOUND)
        
    def delete(self, request, id_usuario):
        try:
            usuario = Usuario.objects.get(id_usuario=id_usuario)
            usuario.delete() 
            return Response({"message": "Solicitud rechazada y eliminada"}, status=status.HTTP_200_OK)
        except Usuario.DoesNotExist:
            return Response({"error": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)
        
class VehiculoListCreateView(APIView):
    permission_classes = [AllowAny]

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

    def put(self, request, id_vehiculo):
        try:
            vehiculo = Vehiculo.objects.get(id_vehiculo=id_vehiculo, propietario=request.user)
            serializer = VehiculoSerializer(vehiculo, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Vehiculo.DoesNotExist:
            return Response({"error": "Vehículo no encontrado o no autorizado"}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, id_vehiculo):
        try:
            vehiculo = Vehiculo.objects.get(id_vehiculo=id_vehiculo, propietario=request.user)
            vehiculo.delete()
            return Response({"message": "Vehículo eliminado correctamente"}, status=status.HTTP_200_OK)
        except Vehiculo.DoesNotExist:
            return Response({"error": "Vehículo no encontrado o no autorizado"}, status=status.HTTP_404_NOT_FOUND)
        
class PerfilUsuarioView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request):
        serializer = userSerializer(request.user, data=request.data, partial=True)
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
    lookup_field = 'id_usuario'

class RegistroAccesoListCreateView(APIView):
    permission_classes = [IsSeguridad]

    def get(self, request):
        if request.user.rol != 'seguridad':
            raise PermissionDenied("No tienes permisos para ver el panel de seguridad.")
        todos_los_accesos = RegistroAcceso.objects.all().order_by('-fecha_hora')[:50]
        serializer = RegistroAccesoSerializer(todos_los_accesos, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        if request.user.rol != 'seguridad':
            raise PermissionDenied("Solo el personal de seguridad puede registrar accesos.")
        
        data = request.data.copy()
        tipo_original = data.get('tipo_movimiento')
        if tipo_original in ["APERTURA_MANUAL", "REGISTRO_VISITANTE"]:
            data['tipo_movimiento'] = 'ENTRADA'
            
            serializer = RegistroAccesoSerializer(data=data)
            if serializer.is_valid():
                serializer.save(
                    vigilante=request.user,
                    tipo_movimiento='ENTRADA'
                )
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = RegistroAccesoSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            serializer.save(vigilante=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
class InformeTurnoCreateView(APIView):
    permission_classes = [IsSeguridad]

    def post(self, request):
        if request.user.rol != 'seguridad':
            raise PermissionDenied("No tienes permisos para generar informes de turno.")
        
        data = request.data
        fecha_hora_inicio = data.get('fecha_hora_inicio')
        novedades = data.get('novedades_observaciones', '')
        sin_novedad = data.get('entrega_sin_novedad', True)
        
        total_entradas = RegistroAcceso.objects.filter(
            vigilante=request.user, 
            tipo_movimiento='ENTRADA',
            fecha_hora__gte=fecha_hora_inicio
        ).count()
        
        total_salidas = RegistroAcceso.objects.filter(
            vigilante=request.user, 
            tipo_movimiento='SALIDA',
            fecha_hora__gte=fecha_hora_inicio
        ).count()
        
        vehiculos_quedados = max(0, total_entradas - total_salidas)
        
        informe = InformeTurno.objects.create(
            vigilante=request.user,
            fecha_hora_inicio=fecha_hora_inicio,
            fecha_hora_fin=timezone.now(),
            novedades_observaciones=novedades,
            entrega_sin_novedad=sin_novedad
        )
        
        return Response({
            "message": "Informe de turno generado con éxito",
            "total_entradas": total_entradas,
            "vehiculos_quedados": vehiculos_quedados
        }, status=status.HTTP_201_CREATED)

class MisRegistrosAccesoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            print(f"Buscando accesos para el usuario: {request.user.correo}")
            accesos = RegistroAcceso.objects.filter(vehiculo__propietario=request.user).order_by('-fecha_hora')
            serializer = RegistroAccesoSerializer(accesos, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": "Error interno en el servidor", "detalle": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class CambiarPasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        password_actual = request.data.get('password_actual')
        password_nueva = request.data.get('password_nueva')

        if not password_actual or not password_nueva:
            return Response({'error': 'Todos los campos son obligatorios.'}, status=status.HTTP_400_BAD_REQUEST)
        if not check_password(password_actual, user.password):
            return Response({'error': 'La contraseña actual es incorrecta.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password_nueva)
        user.save()
        return Response({'message': 'Contraseña actualizada con éxito.'}, status=status.HTTP_200_OK)