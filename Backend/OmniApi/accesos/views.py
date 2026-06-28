import re
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response 
from rest_framework import status, generics, permissions
from rest_framework_simplejwt.tokens import RefreshToken 

from .serializers import (
    RegisterSerializer, userSerializer, LoginSerializer, 
    VehiculoSerializer, CambiarPasswordSerializer
)
from .models import Usuario, Vehiculo

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny] 
    
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            user = serializer.save()
            return Response({"mensaje": "Registro exitoso."}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny] 
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        
        if not user.is_active:
            return Response({"error": "Cuenta en espera de aprobación por administración."}, status=status.HTTP_403_FORBIDDEN)
            
        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token), 
            "refresh": str(refresh),
            "usuario": userSerializer(user).data 
        }, status=status.HTTP_200_OK)


class PerfilUsuarioView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = userSerializer

    def get_object(self):
        return self.request.user


class AgregarVehiculoView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = VehiculoSerializer

    def perform_create(self, serializer):
        serializer.save(propietario=self.request.user)


class CambiarPasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = CambiarPasswordSerializer(data=request.data)
        if serializer.is_valid():
            old_pass = serializer.validated_data.get("old_password")
            new_pass = serializer.validated_data.get("new_password")
            
            if not request.user.check_password(old_pass):
                return Response({"old_password": ["La contraseña actual es incorrecta."]}, status=status.HTTP_400_BAD_REQUEST)
                
            request.user.set_password(new_pass)
            request.user.save()
            return Response({"message": "Password actualizado con éxito."}, status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class HistorialAccesosView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        return Response([], status=status.HTTP_200_OK)


class AdminGestionCuentasView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        usuarios = Usuario.objects.filter(is_active=False, estado = True)
        return Response(userSerializer(usuarios, many=True).data, status=status.HTTP_200_OK)


class AprobarUsuarioView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def patch(self, request, id_usuario):
        user = get_object_or_404(Usuario, id_usuario=id_usuario)
        user.is_active = True
        user.save()
        return Response({"message": f"Usuario {user.correo} aprobado con éxito para ingreso vehicular."}, status=status.HTTP_200_OK)
    

class TodosLosVehiculosView(generics.ListAPIView):
    """ Retorna la lista global de todos los vehículos para el monitor institucional """
    queryset = Vehiculo.objects.filter(activo=True).order_by('-fecha_registro') # <── CORREGIDO A order_by
    serializer_class = VehiculoSerializer
    permission_classes = [permissions.IsAuthenticated]


class UsuarioListCreateView(generics.ListCreateAPIView):
    queryset = Usuario.objects.all()
    serializer_class = userSerializer
    permission_classes = [permissions.IsAuthenticated]

class UsuarioDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Usuario.objects.all()
    serializer_class = userSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id_usuario'
