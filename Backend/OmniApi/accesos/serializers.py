from rest_framework import serializers
from .models import Usuario

class RegisterSerializer(serializers.ModelSerializer):
    class Meta:

        model = Usuario
        fields = ['nombre_completo', 'correo' 'password', 'rol']
        extra_kwargs = {'password': {'write_only': True}}

        def create(self, validated_data):
            return Usuario.objects.create_user(
                correo = validated_data['correo'],
                nombre_completo = validated_data['nombre_completo']
                password = validated_data ['password'],
                rol = validated_data.get ('rol', 'Aprendiz')
            )
        
class userSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id_usuario', 'nombre_completo', 'correo', 'rol', 'estado']