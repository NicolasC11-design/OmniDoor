from rest_framework import serializers
from .models import Usuario

class RegisterSerializer(serializers.ModelSerializer):
    nombres = serializers.CharField(write_only=True)
    apellidos = serializers.CharField(write_only=True)

    class Meta:
        model = Usuario
        fields = ['nombres', 'apellidos', 'correo', 'password', 'rol', 'placa', 'tipoVehiculo']
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
    class Meta:
        model = Usuario
        fields = ['id_usuario', 'nombre_completo', 'correo', 'rol', 'estado']