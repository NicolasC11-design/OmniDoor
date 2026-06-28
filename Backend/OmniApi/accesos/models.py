import uuid
from django.db import models
from django.contrib.auth.models import BaseUserManager, AbstractBaseUser, PermissionsMixin

class UsuarioManager(BaseUserManager):
    def create_user(self, correo, nombre_completo, password=None, **extra_fields):
        if not correo:
            raise ValueError('El usuario debe tener un correo electrónico')
        
        user = self.model(
            correo=self.normalize_email(correo),
            nombre_completo=nombre_completo,
            **extra_fields
        )
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, correo, nombre_completo, password=None, **extra_fields):
        extra_fields.setdefault('is_admin', True)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True) 
        extra_fields.setdefault('is_active', True)
        return self.create_user(correo, nombre_completo, password, **extra_fields)

class Usuario(AbstractBaseUser, PermissionsMixin):
    id_usuario = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre_completo = models.CharField(max_length=150)
    correo = models.EmailField(max_length=100, unique=True)
    rol = models.CharField(max_length=20, default='Aprendiz')
    
    placa = models.CharField(max_length=10, blank=True, null=True)
    tipoVehiculo = models.CharField(max_length=20, blank=True, null=True)
    

    estado = models.BooleanField(default=True) 
    is_active = models.BooleanField(default=False) 
    is_admin = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)

    objects = UsuarioManager()

    USERNAME_FIELD = 'correo'
    REQUIRED_FIELDS = ['nombre_completo'] 

    class Meta:
        db_table = 'usuarios'

    def __str__(self):
        return self.correo
