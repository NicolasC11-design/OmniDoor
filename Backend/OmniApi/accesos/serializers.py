from rest_framework import serializers, generics, permissions
from .models import Usuario, Vehiculo
import re

class VehiculoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehiculo
        fields = ['id_vehiculo', 'tipoVehiculo', 'placa', 'marca', 'modelo', 'fecha_registro']

class RegisterSerializer(serializers.ModelSerializer):
    nombres = serializers.CharField(write_only=True)
    apellidos = serializers.CharField(write_only=True)

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("La contraseña debe tener al menos 8 caracteres.")
        regex = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$'
        if not re.match(regex, value):
            raise serializers.ValidationError(
                "La contraseña debe incluir al menos una mayúscula, una minúscula, un número y un símbolo (@$!%*?&#)."
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

class userSerializer(serializers.ModelSerializer):
    vehiculos = VehiculoSerializer(many=True, read_only=True)

    class Meta:
        model = Usuario
        fields = [
            'id_usuario', 'nombre_completo', 'correo', 'rol', 'estado', 
            'telefono', 'direccion', 'vehiculos'
        ]
class LoginSerializer(serializers.Serializer):
    correo = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, data):
        correo = data.get('correo')
        password = data.get('password')
        if correo and password:
            try:
                user = Usuario.objects.get(correo=correo)
            except Usuario.DoesNotExist:
                raise serializers.ValidationError("Credenciales incorrectas.")
            if not user.check_password(password):
                raise serializers.ValidationError("Credenciales incorrectas.")
        data['user'] = user
        return data

