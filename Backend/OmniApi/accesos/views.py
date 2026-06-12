from django.shortcuts import render
from rest_framework.views import APIView
from rest_framerork.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework.simplejwt.tokens import RefreshToken
from .serializers import RegisterSerializer, userSerializer

class RegisterView(APIView):
    def post (self, request):
        serializer = RegisterSerializer(data = request.data)
        if serializer.is_validate(raise_exception = True):
            user = serializer.save()
            return Response({
                "Mensaje": "Usuario registrado exitosamente",
                "usuario": userSerializer(user).data
            }, status = status.HTTP_201_CREATED
            return Response(serializer.errors, status = status.HTTP_400_BAD_REQUEST)
            )
class LoginView(APIView):
    def post (self, request):
        correo = request.data.get('correo')
        password = request.data.get('password')
        user = authenticate ( correo = correo, password = password)

        if user is not None:
            if not user.estado:
                return Response({
                    "error": "Cuenta inactiva. Contacte al administrador"
                }, status = status.HTTP_403_FORBIDDEN)
            
            refresh = RefreshToken.for_user(user)
            return Response({
                "token": str(refresh.access_token),
                "usuario": userSerializer(user).data
            }, status = status.HTTP_201_OK)

        return Response({"error": "Credenciales invalidas"}, status = status.HTTP_401_UNAUTHORIZED)
                
