from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response  
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken  
from .serializers import RegisterSerializer, userSerializer
from rest_framework.permissions import AllowAny

class RegisterView(APIView):
    permission_classes = [AllowAny] 

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            user = serializer.save()
            return Response({
                "Mensaje": "Usuario registrado exitosamente",
                "usuario": userSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny] 

    def post(self, request):
        correo = request.data.get('correo')
        password = request.data.get('password')
        user = authenticate(username=correo, password=password)

        if user is not None:
            if not user.estado:
                return Response({
                    "error": "Cuenta inactiva. Contacte al administrador"
                }, status=status.HTTP_403_FORBIDDEN)
            
            refresh = RefreshToken.for_user(user)
            return Response({
                "access": str(refresh.access_token),  
                "refresh": str(refresh),
                "usuario": userSerializer(user).data
            }, status=status.HTTP_200_OK)  

        return Response({"error": "Credenciales invalidas"}, status=status.HTTP_401_UNAUTHORIZED)