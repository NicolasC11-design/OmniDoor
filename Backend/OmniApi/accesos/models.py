import uuid
import json
from django.db import models
from django.contrib.auth.models import BaseUserManager, AbstractBaseUser, PermissionsMixin
from django.utils import timezone


class UsuarioManager(BaseUserManager):
    def create_user(self, correo, password=None, **extra_fields):
        if not correo:
            raise ValueError('El usuario debe tener un correo electrónico.')
        correo = self.normalize_email(correo)
        user = self.model(correo=correo, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, correo, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_admin', True)
        extra_fields.setdefault('rol', 'admin')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('El superusuario debe tener is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('El superusuario debe tener is_superuser=True.')

        return self.create_user(correo, password, **extra_fields)


class Usuario(AbstractBaseUser, PermissionsMixin):
    id_usuario = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre_completo = models.CharField(max_length=150)
    correo = models.EmailField(max_length=100, unique=True)
    rol = models.CharField(max_length=20, default='aprendiz')
    ficha = models.CharField(max_length=20, blank=True, null=True, help_text="Número de ficha del aprendiz SENA")
    telefono = models.CharField(max_length=15, blank=True, null=True)
    contacto_emergencia = models.CharField(max_length=15, blank=True, null=True)
    nombre_emergencia = models.CharField(max_length=100, blank=True, null=True)
    direccion = models.CharField(max_length=255, blank=True, null=True)

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


class Vehiculo(models.Model):
    id_vehiculo = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    propietario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='vehiculos')
    tipo_vehiculo = models.CharField(max_length=20, db_column='tipoVehiculo') 
    placa = models.CharField(max_length=15, blank=True, null=True, default='N/A')
    marca = models.CharField(max_length=50, blank=True, null=True, default='GENERICA')
    modelo = models.CharField(max_length=50, blank=True, null=True, default='GENERICO')
    fecha_registro = models.DateTimeField(auto_now_add=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'vehiculos'

    def __str__(self):
        return f"{self.tipo_vehiculo} - {self.placa}"


class RegistroAcceso(models.Model):
    TIPO_MOVIMIENTO = [
        ('ENTRADA', 'Entrada'),
        ('SALIDA', 'Salida'),
        ('APERTURA_MANUAL', 'Apertura Manual'),
        ('DENEGADO', 'Acceso Denegado'),
    ]
    id_registro = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='mis_accesos', null=True, blank=True)
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.CASCADE, related_name='accesos', null=True, blank=True)
    placa_manual = models.CharField(max_length=15, null=True, blank=True)
    tipo_vehiculo_manual = models.CharField(max_length=20, null=True, blank=True)
    nombre_conductor_manual = models.CharField(max_length=100, null=True, blank=True)
    motivo_apertura = models.TextField(null=True, blank=True)

    fecha_hora = models.DateTimeField(default=timezone.now)
    tipo_movimiento = models.CharField(max_length=20, choices=TIPO_MOVIMIENTO)
    vigilante = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, related_name='accesos_registrados')

    class Meta:
        db_table = 'registros_acceso'
        ordering = ['-fecha_hora']

    def __str__(self):
        placa = self.vehiculo.placa if self.vehiculo else (self.placa_manual or 'PEATONAL')
        return f"{self.tipo_movimiento} - {placa} ({self.fecha_hora})"


class InformeTurno(models.Model):
    id_informe = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vigilante = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name='informes_turno')
    fecha_hora_inicio = models.DateTimeField(help_text="Inicio de la jornada laboral del vigilante")
    fecha_hora_fin = models.DateTimeField(default=timezone.now, help_text="Cierre de turno")
    
    total_entradas = models.IntegerField(default=0)
    total_salidas = models.IntegerField(default=0)
    vehiculos_quedados = models.IntegerField(default=0, help_text="Vehículos que no salieron al terminar el turno")
    
    novedades_observaciones = models.TextField(blank=True, null=True, help_text="Reporte escrito de incidentes ocurridos")
    entrega_sin_novedad = models.BooleanField(default=True)

    class Meta:
        db_table = 'informes_turno'
        ordering = ['-fecha_hora_fin']

    def __str__(self):
        return f"Informe Turno - {self.vigilante.nombre_completo} - {self.fecha_hora_fin.strftime('%Y-%m-%d')}"


class BiometriaUsuario(models.Model):
    id_biometria = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='biometria')
    vector_facial = models.TextField(help_text="Vector numérico biométrico codificado")   
    fecha_enrolamiento = models.DateTimeField(default=timezone.now)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'biometria_usuarios'

    def set_descriptor(self, lista_floats):
        if isinstance(lista_floats, list):
            self.vector_facial = json.dumps(lista_floats)

    def get_descriptor(self):
        if self.vector_facial:
            try:
                return json.loads(self.vector_facial)
            except json.JSONDecodeError:
                return []
        return []

    def __str__(self):
        return f"Biometría Facial - {self.usuario.nombre_completo}"