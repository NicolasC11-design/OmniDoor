from rest_framework import serializers, generics, permissions
from .models import Usuario
import re

class RegisterSerializer(serializers.ModelSerializer):
    nombres = serializers.CharField(write_only=True)
    apellidos = serializers.CharField(write_only=True)

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
        placa = data.get('placa', '').strip()

        if tipo_vehiculo in ['bici', 'patin', 'electr']:
            data['placa'] = 'N/A'
        else:
            auto_regex = r'^[A-Za-z]{3}-\d{3}$'
            moto_regex = r'^[A-Za-z]{3}-\d{2}[A-Za-z]$'

            if tipo_vehiculo == 'auto' and not re.match(auto_regex, placa):
                raise serializers.ValidationError({"placa": "El formato de placa para automóvil debe ser ABC-123."})
            
            if tipo_vehiculo == 'moto' and not re.match(moto_regex, placa):
                raise serializers.ValidationError({"placa": "El formato de placa para motocicleta debe ser ABC-12A."})

        return data

    def create(self, validated_data):
        nombres = validated_data.pop('nombres')
        apellidos = validated_data.pop('apellidos')
        user = Usuario.objects.create_user(
            nombre_completo=f"{nombres} {apellidos}",
            **validated_data
        )
        user.is_active = False
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
                raise serializers.ValidationError("El correo o la contraseña son incorrectos.")

            if not user.check_password(password):
                raise serializers.ValidationError("El correo o la contraseña son incorrectos.")
        else:
            raise serializers.ValidationError("Debe incluir 'correo' y 'password'.")

        data['user'] = user
        return data


class userSerializer(serializers.ModelSerializer):
    vehiculos = VehiculoSerializer(many=True, read_only=True)

    class Meta:
        model = Usuario
        fields = ['id_usuario', 'nombre_completo', 'correo', 'rol', 'estado']


class UsuarioListCreateView(generics.ListCreateAPIView):
    queryset = Usuario.objects.all()
    serializer_class = userSerializer
    permission_classes = [permissions.IsAuthenticated]

class UsuarioDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Usuario.objects.all()
    serializer_class = userSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id_usuario'
