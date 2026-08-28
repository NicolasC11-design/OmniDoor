from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

class CorreoBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()
        correo_usuario = username or kwargs.get('correo')
        
        if correo_usuario is None:
            return None
            
        try:
            user = UserModel.objects.get(correo=correo_usuario)
        except UserModel.DoesNotExist:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None