from uuid import UUID
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import Usuario


class UUIDJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user_id = validated_token.get("user_id")
        if not user_id:
            raise AuthenticationFailed("El token no contiene un ID de usuario válido.")
        try:
            if isinstance(user_id, int) or str(user_id).isdigit():
                lookup_id = int(user_id)
            else:
                lookup_id = UUID(str(user_id))
        except (ValueError, TypeError):
            raise AuthenticationFailed("Formato de identificador de usuario inválido en el token.")

        try:
            user = Usuario.objects.get(id_usuario=lookup_id)
            
            if not user.is_active:
                raise AuthenticationFailed("Este usuario está inactivo o suspendido.")
                
            return user

        except Usuario.DoesNotExist:
            raise AuthenticationFailed("Usuario no encontrado o fue eliminado del sistema.")