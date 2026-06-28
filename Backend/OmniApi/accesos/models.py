import uuid
from django.db import models
from django.contrib.auth.models import BaseUserManager, AbstractBaseUser

class UsuarioManager(BaseUserManager):
    def create_user(self, correo, nombre_completo, password=None, rol='Aprendiz'):
        if not correo:
            raise ValueError('El usuario debe tener un correo electronico')
        user = self.model(
            correo=self.normalize_email(correo),
            nombre_completo=nombre_completo,
            rol=rol
        )
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, correo, nombre_completo, password=None, **extra_fields):
        extra_fields.setdefault('is_admin', True)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True) 
        extra_fields.setdefault('is_active', True)

        extra_fields.setdefault('rol', 'Administrador')

        return self.create_user(correo, nombre_completo, password, **extra_fields)

class Usuario(AbstractBaseUser):
    id_usuario = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre_completo = models.CharField(max_length=150)
    correo = models.EmailField(max_length=100, unique=True)
    rol = models.CharField(max_length=20, default='aprendiz')
    
    telefono = models.CharField(max_length=15, blank=True, null=True)
    direccion = models.CharField(max_length=200, blank=True, null=True)
    
    nombre_emergencia = models.CharField(max_length=150, blank=True, null=True)
    contacto_emergencia = models.CharField(max_length=15, blank=True, null=True)

    estado = models.BooleanField(default=True) 
    is_active = models.BooleanField(default=False)
    is_admin = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)

    objects = UsuarioManager()

    USERNAME_FIELD = 'correo'
    REQUIRED_FIELDS = ['nombre_completo'] 

    class Meta:
        db_table = 'usuarios'
    def has_perm(self, perm, obj=None):
        return self.is_admin

    def __str__(self):
        return self.correo


class Vehiculo(models.Model):
    id_vehiculo = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    propietario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='vehiculos')
    
    tipoVehiculo = models.CharField(max_length=20)
    placa = models.CharField(max_length=10, blank=True, null=True)
    marca = models.CharField(max_length=50, blank=True, null=True)
    modelo = models.CharField(max_length=50, blank=True, null=True)
    
    fecha_registro = models.DateTimeField(auto_now_add=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'vehiculos'

    def __str__(self):
        return f"{self.tipoVehiculo} - {self.placa} ({self.propietario.nombre_completo})"
    


    
