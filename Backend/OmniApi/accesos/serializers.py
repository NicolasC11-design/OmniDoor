import re
from rest_framework import serializers
from .models import Usuario, Vehiculo

class VehiculoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehiculo
        # Agregamos marca y modelo para que viajen al Dashboard de Angular
        fields = ['id_vehiculo', 'tipoVehiculo', 'placa', 'marca', 'modelo', 'fecha_registro', 'activo']


class RegisterSerializer(serializers.ModelSerializer):
    nombres = serializers.CharField(write_only=True)
    apellidos = serializers.CharField(write_only=True)
    tipoVehiculo = serializers.CharField(write_only=True, required=False, allow_blank=True)
    placa = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    # Declaramos los nuevos campos obligatorios y extras que vienen de Angular
    nombre_emergencia = serializers.CharField(required=True)
    marca = serializers.CharField(write_only=True, required=False, allow_blank=True)
    modelo = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Usuario
        fields = [
            'nombres', 'apellidos', 'correo', 'password', 'rol', 
            'telefono', 'contacto_emergencia', 'direccion', 'nombre_emergencia',
            'tipoVehiculo', 'placa', 'marca', 'modelo'
        ]
        extra_kwargs = {'password': {'write_only': True}}

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("La contraseña debe tener al menos 8 caracteres.")
        
        regex_segura = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$'
        if not re.match(regex_segura, value):
            raise serializers.ValidationError(
                "La contraseña debe incluir al menos una mayúscula, una minúscula, un número y un símbolo (@$!%*?&#)."
            )
        return value

    def validate(self, data):
        tipo_vehiculo = data.get('tipoVehiculo')
        placa = data.get('placa', '').strip().upper() # Forzamos mayúsculas limpias

        if tipo_vehiculo:
            if tipo_vehiculo in ['bici', 'patin', 'electr']:
                data['placa'] = 'SIN PLACA'
                data['marca'] = 'GENERICA'
                data['modelo'] = 'GENERICO'
            else:
                auto_regex = r'^[A-Z]{3}-?\d{3}$'
                moto_regex = r'^[A-Z]{3}-?\d{2}[A-Z]$'

                if tipo_vehiculo == 'auto' and not re.match(auto_regex, placa):
                    raise serializers.ValidationError({"placa": "El formato de placa para automóvil debe ser ABC-123."})
                
                if tipo_vehiculo == 'moto' and not re.match(moto_regex, placa):
                    raise serializers.ValidationError({"placa": "El formato de placa para motocicleta debe ser ABC-12A."})
                
                if not data.get('marca') or not data.get('modelo'):
                    raise serializers.ValidationError({"vehiculo": "Los vehículos motorizados requieren Marca y Modelo."})

        return data

    def create(self, validated_data):

        nombres = validated_data.pop('nombres')
        apellidos = validated_data.pop('apellidos')
        tipo_vehiculo = validated_data.pop('tipoVehiculo', None)
        placa = validated_data.pop('placa', None)
        marca = validated_data.pop('marca', None)
        modelo = validated_data.pop('modelo', None)

        user = Usuario.objects.create_user(
            correo=validated_data['correo'],
            password=validated_data['password'],
            nombre_completo=f"{nombres} {apellidos}",
            rol=validated_data.get('rol', 'Usuario')
        )
        user.is_active = False # Esperando aprobación del admin en portería
        user.save()

        if tipo_vehiculo:
            Vehiculo.objects.create(
                propietario=user,
                tipoVehiculo=tipo_vehiculo,
                placa=placa,
                marca=marca,
                modelo=modelo
            )
        
        return user

class userSerializer(serializers.ModelSerializer):
    vehiculos = VehiculoSerializer(many=True, read_only=True)

    class Meta:
        model = Usuario
        fields = [
            'id_usuario', 'nombre_completo', 'correo', 'rol', 'estado',
            'telefono', 'nombre_emergencia', 'contacto_emergencia', 'direccion', 'vehiculos'
        ]


class CambiarPasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)

    def validate_new_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("La contraseña debe tener al menos 8 caracteres.")
        return value
