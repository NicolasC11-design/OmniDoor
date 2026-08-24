import re
from django.db import IntegrityError
from django.db.models import Q, Value
from django.db.models.functions import Replace
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import Usuario, Vehiculo, RegistroAcceso, InformeTurno



def validar_formato_placa(placa, tipo_vehiculo):
    placa_limpia = str(placa).strip().replace('-', '').upper()
    tipo = str(tipo_vehiculo).strip().upper() if tipo_vehiculo else "AUTOMOVIL"

    patron_carro = r'^[A-Z]{3}\d{3}$'
    patron_moto = r'^[A-Z]{3}\d{2}[A-Z]$'

    if tipo in ['MOTO', 'MOTOCICLETA']:
        if not re.match(patron_moto, placa_limpia):
            raise serializers.ValidationError(
                f"La placa '{placa}' no es válida para MOTO. Debe ser formato 3 letras, 2 números y 1 letra (ej. ABC12D)."
            )
    else:
        if not re.match(patron_carro, placa_limpia):
            raise serializers.ValidationError(
                f"La placa '{placa}' no es válida para AUTOMÓVIL. Debe ser formato 3 letras y 3 números (ej. ABC123)."
            )
    
    return placa_limpia

class VehiculoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehiculo
        fields = ['id_vehiculo', 'tipoVehiculo', 'placa', 'marca', 'modelo', 'fecha_registro']

    def validate(self, data):
        placa = data.get('placa')
        tipo = data.get('tipoVehiculo')

        if placa:
            data['placa'] = validar_formato_placa(placa, tipo)
            
        return data

class userSerializer(serializers.ModelSerializer):
    vehiculos = VehiculoSerializer(many=True, read_only=True)
    rol = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = [
            'id_usuario', 'nombre_completo', 'correo', 'rol', 'ficha', 'estado', 
            'telefono', 'direccion', 'vehiculos'
        ]
    
    def get_rol(self, obj):
        return 'administrador' if obj.rol == 'admin' else obj.rol

class RegisterSerializer(serializers.ModelSerializer):
    nombres = serializers.CharField(write_only=True)
    apellidos = serializers.CharField(write_only=True)
    correo = serializers.EmailField(
        validators=[UniqueValidator(queryset=Usuario.objects.all(), message="Este correo electrónico ya está registrado.")]
    )
    placa = serializers.CharField(write_only=True, required=False, allow_blank=True)
    tipoVehiculo = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Usuario
        fields = [
            'nombres', 'apellidos', 'correo', 'password', 'rol', 'ficha', 
            'telefono', 'contacto_emergencia', 'nombre_emergencia', 'direccion',
            'placa', 'tipoVehiculo'
        ]
        extra_kwargs = {'password': {'write_only': True}}

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("La contraseña debe tener al menos 8 caracteres.")
        regex = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$'
        if not re.match(regex, value):
            raise serializers.ValidationError(
                "La contraseña debe incluir al menos una mayúscula, una minúscula, un número y un símbolo."
            )
        return value

    def validate(self, data):
        placa_input = data.get('placa')
        tipo_input = data.get('tipoVehiculo')

        if placa_input and str(placa_input).strip():
            placa_limpia = validar_formato_placa(placa_input, tipo_input)
            placa_duplicada = Vehiculo.objects.annotate(
                placa_sin_guion=Replace('placa', Value('-'), Value(''))
            ).filter(placa_sin_guion=placa_limpia).exists()

            if placa_duplicada:
                raise serializers.ValidationError(
                    {"placa": f"Inconsistencia de seguridad: La placa '{placa_limpia}' ya está registrada por otro usuario vehicular."}
                )

            data['placa'] = placa_limpia

        return data

    def create(self, validated_data):
        nombres = validated_data.pop('nombres')
        apellidos = validated_data.pop('apellidos')
        placa_input = validated_data.pop('placa', None)
        tipo_input = validated_data.pop('tipoVehiculo', None)
        print(f"=== DATOS DETECTADOS => Placa: '{placa_input}', Tipo: '{tipo_input}' ===")

        try:
            user = Usuario.objects.create_user(
                nombre_completo=f"{nombres} {apellidos}",
                **validated_data
            )
            user.is_active = False
            user.save()
            if placa_input and str(placa_input).strip():
                placa_final = str(placa_input).strip().replace('-', '').upper()
                
                vehiculo_creado = Vehiculo.objects.create(
                    propietario=user,
                    placa=placa_final,
                    tipoVehiculo=str(tipo_input).strip().upper() if tipo_input else "AUTOMOVIL"
                )
                print(f"=== VEHÍCULO GUARDADO EN BASE DE DATOS: {vehiculo_creado} ===")
            
            return user

        except IntegrityError as e:
            if 'correo' in str(e).lower():
                raise serializers.ValidationError({"correo": "Este correo electrónico ya está registrado."})
            raise serializers.ValidationError({"error": f"Error de base de datos: {str(e)}"})

    class Meta:
        model = Usuario
        fields = [
            'nombres', 'apellidos', 'correo', 'password', 'rol', 'ficha', 
            'telefono', 'contacto_emergencia', 'nombre_emergencia', 'direccion',
            'placa', 'tipoVehiculo'
        ]
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        nombres = validated_data.pop('nombres')
        apellidos = validated_data.pop('apellidos')
        placa_input = validated_data.pop('placa', None)
        tipo_input = validated_data.pop('tipoVehiculo', None)
        print(f"=== DATOS DETECTADOS => Placa: '{placa_input}', Tipo: '{tipo_input}' ===")

        try:
            user = Usuario.objects.create_user(
                nombre_completo=f"{nombres} {apellidos}",
                **validated_data
            )
            user.is_active = False
            user.save()
            if placa_input and str(placa_input).strip():
                placa_final = str(placa_input).strip().replace('-', '').upper()
                
                vehiculo_creado = Vehiculo.objects.create(
                    propietario=user,
                    placa=placa_final,
                    tipoVehiculo=str(tipo_input).strip().upper() if tipo_input else "AUTOMOVIL"
                )
                print(f"=== VEHÍCULO GUARDADO EN BASE DE DATOS: {vehiculo_creado} ===")
            
            return user

        except IntegrityError as e:
            if 'correo' in str(e).lower():
                raise serializers.ValidationError({"correo": "Este correo electrónico ya está registrado."})
            raise serializers.ValidationError({"error": f"Error de base de datos: {str(e)}"})

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
        if obj.motivo_apertura and "RECHAZADO" in obj.motivo_apertura.upper():
            return "DENEGADO"
        if obj.vehiculo and obj.vehiculo.propietario and obj.vehiculo.placa != "APERTURA_M":
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

    def validate(self, data):
        vehiculo = data.get('vehiculo')
        placa_input = data.get('placa_vehiculo_input')
        tipo_movimiento = data.get('tipo_movimiento')
        motivo_input = data.get('motivo_input', '')
        
        placa_limpia = None
        if placa_input:
            placa_limpia = str(placa_input).strip().replace('-', '').upper()
            data['placa_vehiculo_input'] = placa_limpia
            
        if tipo_movimiento == 'APERTURA_MANUAL':
            if not placa_limpia:
                raise serializers.ValidationError(
                    {"placa_vehiculo_input": "La placa es obligatoria."}
                )
            
            if "RECHAZADO" in motivo_input.upper():
                return data 
            
            vehiculo_existente = Vehiculo.objects.annotate(
                placa_sin_guion=Replace('placa', Value('-'), Value(''))
            ).filter(placa_sin_guion=placa_limpia).first()
            
            if not vehiculo_existente:
                raise serializers.ValidationError(
                    "Acceso Denegado. La placa ingresada no se encuentra registrada en la base de datos."
                )
            
            data['vehiculo'] = vehiculo_existente
            if "Apertura Manual" not in motivo_input:
                data['motivo_input'] = f"Apertura Manual - {motivo_input}".strip()
            
            return data
        
        es_visitante = "Visitante:" in motivo_input or "VISITANTE" in motivo_input.upper()
        placa_a_validar = vehiculo.placa if vehiculo else placa_limpia
        
        if not vehiculo and placa_limpia and not es_visitante:
            vehiculo_existente = Vehiculo.objects.annotate(
                placa_sin_guion=Replace('placa', Value('-'), Value(''))
            ).filter(placa_sin_guion=placa_limpia, propietario__is_active=True).first()
            
            if vehiculo_existente:
                data['vehiculo'] = vehiculo_existente
                placa_a_validar = vehiculo_existente.placa

        if placa_a_validar and placa_a_validar not in ['', 'S_PLACA', 'N/A'] and tipo_movimiento in ['ENTRADA', 'SALIDA']:
            placa_comparar = placa_a_validar.replace('-', '').upper()
            ultimo_registro = RegistroAcceso.objects.annotate(
                placa_m_sin_guion=Replace('placa_manual', Value('-'), Value('')),
                placa_v_sin_guion=Replace('vehiculo__placa', Value('-'), Value(''))
            ).filter(
                Q(placa_v_sin_guion=placa_comparar) | Q(placa_m_sin_guion=placa_comparar)
            ).order_by('-fecha_hora').first()

            if ultimo_registro:
                if ultimo_registro.tipo_movimiento == tipo_movimiento:
                    raise serializers.ValidationError(
                        f"Inconsistencia de seguridad: El vehículo con placa {placa_a_validar} ya registró una {tipo_movimiento.lower()} anteriormente."
                    )
        
        return data

    def create(self, validated_data):
        placa = validated_data.pop('placa_vehiculo_input', None)
        tipo = validated_data.pop('tipo_vehiculo_input', None)
        conductor = validated_data.pop('nombre_conductor_input', None)
        motivo = validated_data.pop('motivo_input', None)
        registro = RegistroAcceso.objects.create(**validated_data)
        
        if registro.tipo_movimiento == 'APERTURA_MANUAL' or not registro.vehiculo:
            registro.placa_manual = placa if placa else (registro.vehiculo.placa if registro.vehiculo else None)
            registro.tipo_vehiculo_manual = tipo if tipo else (registro.vehiculo.tipoVehiculo if registro.vehiculo else "AUTOMOVIL")
            registro.nombre_conductor_manual = conductor if conductor else (registro.vehiculo.propietario.nombre_completo if registro.vehiculo else "VISITANTE TEMPORAL")
            registro.motivo_apertura = motivo
            registro.save()
            print(f"=== APERTURA MANUAL REGISTRADA => Vehículo vinculado: {registro.vehiculo} ===")
        else:
            print(f"=== ACCESO REGISTRADO => Residente detectado automáticamente: {registro.vehiculo.placa} ===")

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

class UsuarioUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['nombre_completo', 'telefono', 'direccion', 'ficha']

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        for bool_field in ['estado', 'is_active', 'is_admin', 'is_staff']:
            val = getattr(instance, bool_field, None)
            if isinstance(val, str):
                setattr(instance, bool_field, val.lower() in ['true', '1', 't'])
        campos_a_actualizar = list(validated_data.keys())
        instance.save(update_fields=campos_a_actualizar)
        return instance