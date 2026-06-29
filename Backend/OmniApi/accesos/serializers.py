from rest_framework import serializers
from .models import Usuario, Vehiculo, RegistroAcceso, InformeTurno
import re

class VehiculoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehiculo
        fields = ['id_vehiculo', 'tipoVehiculo', 'placa', 'marca', 'modelo', 'fecha_registro']

class userSerializer(serializers.ModelSerializer):
    vehiculos = VehiculoSerializer(many=True, read_only=True)
    rol = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = [
            'id_usuario', 'nombre_completo', 'correo', 'rol', 'estado', 
            'telefono', 'direccion', 'vehiculos'
        ]
    
    def get_rol(self, obj):
        return 'administrador' if obj.rol == 'admin' else obj.rol

class RegisterSerializer(serializers.ModelSerializer):
    nombres = serializers.CharField(write_only=True)
    apellidos = serializers.CharField(write_only=True)

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("La contraseña debe tener al menos 8 caracteres.")
        regex = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$'
        if not re.match(regex, value):
            raise serializers.ValidationError(
                "La contraseña debe incluir al menos una mayúscula, una minúscula, un número y un símbolo."
            )
        return value

    class Meta:
        model = Usuario
        fields = [
            'nombres', 'apellidos', 'correo', 'password', 'rol', 
            'telefono', 'contacto_emergencia', 'nombre_emergencia', 'direccion'
        ]
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        nombres = validated_data.pop('nombres')
        apellidos = validated_data.pop('apellidos')
        user = Usuario.objects.create_user(
            nombre_completo=f"{nombres} {apellidos}",
            **validated_data
        )
        user.is_active = False
        user.save()
        return user

class LoginSerializer(serializers.Serializer):
    correo = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, data):
        correo = data.get('correo')
        password = data.get('password')
        try:
            user = Usuario.objects.get(correo=correo)
        except Usuario.DoesNotExist:
            raise serializers.ValidationError("Credenciales incorrectas.")
        
        if not user.check_password(password):
            raise serializers.ValidationError("Credenciales incorrectas.")
        
        data['user'] = user
        return data

class RegistroAccesoSerializer(serializers.ModelSerializer):
    placa_vehiculo = serializers.SerializerMethodField()
    tipo_vehiculo = serializers.SerializerMethodField()
    nombre_conductor = serializers.SerializerMethodField()
    rol_acceso = serializers.SerializerMethodField()

    nombre_vigilante = serializers.ReadOnlyField(source='vigilante.nombre_completo')
    fecha = serializers.SerializerMethodField()
    hora = serializers.SerializerMethodField()
    movimiento = serializers.CharField(source='tipo_movimiento', read_only=True)
    autorizado = serializers.SerializerMethodField()

    placa_vehiculo_input = serializers.CharField(write_only=True, required=False, allow_blank=True)
    tipo_vehiculo_input = serializers.CharField(write_only=True, required=False, allow_blank=True)
    nombre_conductor_input = serializers.CharField(write_only=True, required=False, allow_blank=True)
    motivo_input = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = RegistroAcceso
        fields = [
            'id_registro', 'vehiculo', 'placa_vehiculo', 'tipo_vehiculo', 
            'nombre_conductor', 'fecha_hora', 'tipo_movimiento', 'rol_acceso', 
            'vigilante', 'nombre_vigilante', 'fecha', 'hora', 'movimiento', 'autorizado',
            'placa_vehiculo_input', 'tipo_vehiculo_input', 'nombre_conductor_input', 'motivo_input'
        ]
        extra_kwargs = {'vehiculo': {'required': False, 'allow_null': True}}

    def get_rol_acceso(self, obj):
        if obj.vehiculo and obj.vehiculo.propietario and obj.vehiculo.placa != "APERTURA_M" and obj.vehiculo.marca != "VISITANTE":
            return "RESIDENTE"
        if obj.motivo_apertura and "Apertura Manual" in obj.motivo_apertura:
            return "APERTURA_M"
        return "VISITANTE"

    def get_nombre_conductor(self, obj):
        if obj.nombre_conductor_manual:
            return obj.nombre_conductor_manual.strip().upper()
        if obj.vehiculo and obj.vehiculo.propietario:
            return obj.vehiculo.propietario.nombre_completo.strip().upper()
            
        return "VISITANTE TEMPORAL"

    def get_placa_vehiculo(self, obj):
        return obj.vehiculo.placa if obj.vehiculo else (obj.placa_manual or "S_PLACA")

    def get_tipo_vehiculo(self, obj):
        return obj.vehiculo.tipoVehiculo if obj.vehiculo else (obj.tipo_vehiculo_manual or "CARRO")

    def get_fecha(self, obj):
        return obj.fecha_hora.date().strftime('%Y-%m-%d')

    def get_hora(self, obj):
        return obj.fecha_hora.time().strftime('%H:%M')

    def get_autorizado(self, obj):
        try:
            return obj.vehiculo.propietario.estado if obj.vehiculo else True
        except AttributeError:
            return True

    def create(self, validated_data):
        placa = validated_data.pop('placa_vehiculo_input', None)
        tipo = validated_data.pop('tipo_vehiculo_input', None)
        conductor = validated_data.pop('nombre_conductor_input', None)
        motivo = validated_data.pop('motivo_input', None)
        registro = RegistroAcceso.objects.create(**validated_data)
        if not registro.vehiculo:
            registro.placa_manual = placa
            registro.tipo_vehiculo_manual = tipo
            registro.nombre_conductor_manual = conductor
            registro.motivo_apertura = motivo
            registro.save()

        return registro

class InformeTurnoSerializer(serializers.ModelSerializer):
    nombre_vigilante = serializers.ReadOnlyField(source='vigilante.nombre_completo')

    class Meta:
        model = InformeTurno
        fields = [
            'id_informe', 'vigilante', 'nombre_vigilante', 'fecha_hora_inicio', 
            'fecha_hora_fin', 'total_entradas', 'total_salidas', 
            'vehiculos_quedados', 'novedades_observaciones', 'entrega_sin_novedad'
        ]
        read_only_fields = ['total_entradas', 'total_salidas', 'vehiculos_quedados']