from rest_framework import serializers
from .models import Usuario

class RegisterSerializer(serializers.ModelSerializer):
    nombres = serializers.CharField(write_only=True)
    apellidos = serializers.CharField(write_only=True)
    placa = serializers.CharField(write_only=True)
    tipoVehiculo = serializers.CharField(write_only=True)

    class Meta:
        model = Usuario
        fields = ['nombres', 'apellidos', 'correo', 'password', 'rol', 'placa', 'tipoVehiculo']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):

        nombres = validated_data.pop('nombres')
        apellidos = validated_data.pop('apellidos')
        placa = validated_data.pop('placa')
        tipoVehiculo = validated_data.pop('tipoVehiculo')
        

        user = Usuario.objects.create_user(
            correo=validated_data['correo'],
            password=validated_data['password'],
            nombre_completo=f"{nombres} {apellidos}",
            rol=validated_data.get('rol', 'Usuario')
        )
        

        user.placa = placa
        user.tipoVehiculo = tipoVehiculo
        user.save()
        
        return user

class userSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id_usuario', 'nombre_completo', 'correo', 'rol', 'estado']