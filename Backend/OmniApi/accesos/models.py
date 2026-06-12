import uuid
from django.db import models
from django.contrib.auth.models import BaseUserManager, AbstractBaseUser

class UsuarioManager(BaseUserManager):
    def create_user(self, correo, nombre_completo, password = None, rol = 'Aprendiz'):
        if not correo:
            raise ValueError('El usuario debe tener un correo electronico')
        user = self.model(
            correo = self.normalize_email(correo),
            nombre_completo = nombre_completo,
            rol = rol
        )
        user.set_password(password)
        user.save(using = self._db)
        return user
    
    def create_superuser(self, correo, nombre_completo, password = None):
        user = self.create_user(correo, nombre_completo, password, rol='Admin')
        user.is_admin = True
        user.save(using = self._db)
        return user
    

class Usuario(AbstractBaseUser):
    id_usuario = models.UUIDField(primary_key = True, default= uuid, editable = False)
    nombre_completo = models.CharField(max_length = 150)
    correo = models.CharField(max_length = 100, unique = True)
    rol = models.CharField(max_length = 20, default='Aprendiz')
    estado = models.BooleanField(default = True)

    objects = UsuarioManager()

    USERNAME_FIELD = 'correo'
    REQUIRED_FIELDS = ['nombre_completo'] 

    class Meta:
        db_table = 'usuarios'
