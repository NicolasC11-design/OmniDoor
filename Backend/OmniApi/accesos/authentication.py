from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from uuid import UUID
from .models import Usuario

class UUIDJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        try:
            user_id = validated_token.get("user_id")
            print(f"DEBUG: Token recibido con user_id: {user_id}")
            if not user_id:
                raise AuthenticationFailed("El token no contiene un user_id válido.")

            try:
                uuid_obj = UUID(str(user_id))
            except ValueError:
                raise AuthenticationFailed("Formato de UUID inválido en el token.")

            user = Usuario.objects.get(id_usuario=uuid_obj)
            
            if not user.is_active:
                raise AuthenticationFailed("Este usuario está inactivo.")
                
            return user

        except Usuario.DoesNotExist:
            raise AuthenticationFailed("Usuario no encontrado asociado a este token.")