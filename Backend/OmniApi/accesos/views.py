from rest_framework.views import APIView
from rest_framework.response import Response  
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken  
from .serializers import RegisterSerializer, userSerializer, LoginSerializer
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import Usuario

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

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
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
    permission_classes = [IsAuthenticated] 

    def get(self, request):
        usuarios_pendientes = Usuario.objects.filter(is_active=False)
        serializer = userSerializer(usuarios_pendientes, many=True)
        return Response(serializer.data)

class AprobarUsuarioView(APIView):
    permission_classes = [IsAuthenticated]

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
        

class PerfilUsuarioView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request):
        serializer = userSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)