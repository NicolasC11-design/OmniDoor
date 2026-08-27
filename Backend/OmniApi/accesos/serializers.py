import re
from django.db import IntegrityError, transaction
from django.db.models import Q, Value
from django.db.models.functions import Replace
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import BiometriaUsuario, InformeTurno, RegistroAcceso, Usuario, Vehiculo


def validar_formato_placa(placa, tipo_vehiculo):
    if not placa or str(placa).strip().upper() in ['N/A', 'S_PLACA', 'SIN_PLACA', 'NONE']:
        return None

    placa_limpia = str(placa).strip().replace('-', '').replace(' ', '').upper()
    tipo = str(tipo_vehiculo).strip().upper() if tipo_vehiculo else "AUTOMOVIL"
    if tipo in ['BICICLETA', 'PATIN', 'PATINETA', 'ELECTRICO', 'PEATONAL']:
        return placa_limpia

    patron_carro = r'^[A-Z]{3}\d{3}$'
    patron_moto = r'^[A-Z]{3}\d{2}[A-Z]$'

    if tipo in ['MOTO', 'MOTOCICLETA']:
        if not re.match(patron_moto, placa_limpia):
            raise serializers.ValidationError(
                f"La placa '{placa}' no es válida para MOTO. Debe ser formato 3 letras, 2 números y 1 letra (ej. ABC12D)."
            )
    elif tipo in ['AUTO', 'AUTOMOVIL', 'CARRO']:
        if not re.match(patron_carro, placa_limpia):
            raise serializers.ValidationError(
                f"La placa '{placa}' no es válida para AUTO. Debe ser formato 3 letras y 3 números (ej. ABC123)."
            )

    return placa_limpia


class VehiculoSerializer(serializers.ModelSerializer):
    tipo_vehiculo = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Vehiculo
        fields = ['id_vehiculo', 'propietario', 'tipo_vehiculo', 'placa', 'marca', 'modelo', 'fecha_registro']
        read_only_fields = ['id_vehiculo', 'propietario', 'fecha_registro']

    def validate(self, data):
        placa = data.get('placa')
        tipo = data.get('tipo_vehiculo')

        if placa:
            placa_limpia = validar_formato_placa(placa, tipo)
            data['placa'] = placa_limpia
            
            vehiculos_queryset = Vehiculo.objects.annotate(
                placa_sin_guion=Replace('placa', Value('-'), Value(''))
            ).filter(placa_sin_guion=placa_limpia, activo=True)
            
            if self.instance:
                vehiculos_queryset = vehiculos_queryset.exclude(id_vehiculo=self.instance.id_vehiculo)
                
            if vehiculos_queryset.exists():
                raise serializers.ValidationError(
                    {"placa": f"La placa '{placa}' ya está registrada en el sistema por otro usuario."}
                )
            
        return data

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['propietario'] = request.user
        return super().create(validated_data)

class userSerializer(serializers.ModelSerializer):
    vehiculos = serializers.SerializerMethodField()
    nombre_completo = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    correo = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    rol = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    ficha = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    telefono = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    direccion = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    nombre_emergencia = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    contacto_emergencia = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    placa = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    tipo_vehiculo = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Usuario
        fields = [
            'id_usuario', 'nombre_completo', 'correo', 'rol', 'ficha', 'estado', 'is_active',
            'telefono', 'direccion', 'contacto_emergencia', 'nombre_emergencia', 'vehiculos',
            'placa', 'tipo_vehiculo'
        ]
        read_only_fields = ['id_usuario']

    def get_vehiculos(self, obj):
        v_qs = (
            Vehiculo.objects.filter(propietario=obj, activo=True) 
            if hasattr(Vehiculo, 'propietario') 
            else Vehiculo.objects.filter(usuario=obj, activo=True)
        )
        return [
            {
                'id_vehiculo': v.id_vehiculo if hasattr(v, 'id_vehiculo') else getattr(v, 'id', None),
                'placa': v.placa,
                'tipo_vehiculo': getattr(v, 'tipo_vehiculo', getattr(v, 'tipoVehiculo', 'AUTOMOVIL'))
            } 
            for v in v_qs
        ]

    @transaction.atomic
    def update(self, instance, validated_data):

        request_data = {**validated_data}
        if self.context and self.context.get('request') and hasattr(self.context['request'], 'data'):
            request_data.update(self.context['request'].data)

        if 'nombre_completo' in request_data and request_data['nombre_completo']:
            val_nombre = str(request_data['nombre_completo']).strip()
            if hasattr(instance, 'nombre_completo'):
                instance.nombre_completo = val_nombre
            elif hasattr(instance, 'nombres'):
                partes = val_nombre.split(' ', 1)
                instance.nombres = partes[0]
                if hasattr(instance, 'apellidos'):
                    instance.apellidos = partes[1] if len(partes) > 1 else ''

        if 'correo' in request_data and request_data['correo']:
            val_correo = str(request_data['correo']).strip()
            if hasattr(instance, 'correo'):
                instance.correo = val_correo
            elif hasattr(instance, 'email'):
                instance.email = val_correo

        # 3. Actualización de Campos Directos (Teléfono, Dirección, Ficha SENA, Emergencias, Rol)
        campos_directos = ['telefono', 'direccion', 'ficha', 'nombre_emergencia', 'contacto_emergencia', 'rol']
        for campo in campos_directos:
            if campo in request_data and request_data[campo] is not None:
                if hasattr(instance, campo):
                    setattr(instance, campo, str(request_data[campo]).strip())

        if hasattr(instance, 'rol') and instance.rol:
            rol_normalizado = str(instance.rol).lower()
            if rol_normalizado in ['admin', 'administrador']:
                if hasattr(instance, 'is_admin'): instance.is_admin = True
                if hasattr(instance, 'is_staff'): instance.is_staff = True
                if hasattr(instance, 'is_superuser'): instance.is_superuser = True
        for bool_field in ['estado', 'is_active', 'is_admin', 'is_staff']:
            if hasattr(instance, bool_field):
                val = getattr(instance, bool_field)
                if isinstance(val, str):
                    setattr(instance, bool_field, val.lower() in ['true', '1', 'activo'])

        instance.save()
        placa_raw = request_data.get('placa')
        tipo_raw = request_data.get('tipo_vehiculo') or request_data.get('tipoVehiculo')

        if placa_raw is not None and str(placa_raw).strip() != '':
            tipo_final = str(tipo_raw).strip().upper() if tipo_raw else "AUTOMOVIL"
            placa_limpia = validar_formato_placa(placa_raw, tipo_final)

            if placa_limpia:
                relacion_kw = {'propietario': instance} if hasattr(Vehiculo, 'propietario') else {'usuario': instance}
                vehiculo = Vehiculo.objects.filter(**relacion_kw).first()

                vehiculos_duplicados = Vehiculo.objects.annotate(
                    placa_sin_guion=Replace('placa', Value('-'), Value(''))
                ).filter(placa_sin_guion=placa_limpia, activo=True)

                if vehiculo:
                    vehiculos_duplicados = vehiculos_duplicados.exclude(pk=vehiculo.pk)

                if vehiculos_duplicados.exists():
                    raise serializers.ValidationError(
                        {"placa": f"La placa '{placa_limpia}' ya está registrada por otro usuario."}
                    )

                if vehiculo:
                    vehiculo.placa = placa_limpia
                    if hasattr(vehiculo, 'tipo_vehiculo'): vehiculo.tipo_vehiculo = tipo_final
                    if hasattr(vehiculo, 'tipoVehiculo'): vehiculo.tipoVehiculo = tipo_final
                    if hasattr(vehiculo, 'activo'): vehiculo.activo = True
                    vehiculo.save()
                else:
                    kwargs_crear = {'placa': placa_limpia}
                    if hasattr(Vehiculo, 'propietario'): kwargs_crear['propietario'] = instance
                    elif hasattr(Vehiculo, 'usuario'): kwargs_crear['usuario'] = instance

                    if hasattr(Vehiculo, 'tipo_vehiculo'): kwargs_crear['tipo_vehiculo'] = tipo_final
                    elif hasattr(Vehiculo, 'tipoVehiculo'): kwargs_crear['tipoVehiculo'] = tipo_final
                    if hasattr(Vehiculo, 'activo'): kwargs_crear['activo'] = True

                    Vehiculo.objects.create(**kwargs_crear)

        return instance



class RegisterSerializer(serializers.ModelSerializer):
    nombres = serializers.CharField(write_only=True)
    apellidos = serializers.CharField(write_only=True)
    correo = serializers.EmailField(
        validators=[UniqueValidator(queryset=Usuario.objects.all(), message="Este correo electrónico ya está registrado.")]
    )
    placa = serializers.CharField(write_only=True, required=False, allow_blank=True)
    tipo_vehiculo = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Usuario
        fields = [
            'nombres', 'apellidos', 'correo', 'password', 'rol', 'ficha', 
            'telefono', 'contacto_emergencia', 'nombre_emergencia', 'direccion',
            'placa', 'tipo_vehiculo'
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
        tipo_input = data.get('tipo_vehiculo')

        if placa_input and str(placa_input).strip():
            placa_limpia = validar_formato_placa(placa_input, tipo_input)
            placa_duplicada = Vehiculo.objects.annotate(
                placa_sin_guion=Replace('placa', Value('-'), Value(''))
            ).filter(placa_sin_guion=placa_limpia, activo=True).exists()

            if placa_duplicada:
                raise serializers.ValidationError(
                    {"placa": f"Inconsistencia de seguridad: La placa '{placa_limpia}' ya está registrada por otro usuario vehicular."}
                )

            data['placa'] = placa_limpia

        return data

    def create(self, validated_data):
        nombres = validated_data.pop('nombres')
        apellidos = validated_data.pop('apellidos')
        correo = validated_data.pop('correo')
        placa_input = validated_data.pop('placa', None)
        tipo_input = validated_data.pop('tipo_vehiculo', None)
        password = validated_data.pop('password')

        try:
            user = Usuario.objects.create_user(
                correo=correo,
                password=password,
                nombre_completo=f"{nombres} {apellidos}".strip(),
                **validated_data
            )
            user.is_active = False
            user.estado = False
            user.save()

            if placa_input and str(placa_input).strip():
                placa_final = str(placa_input).strip().replace('-', '').upper()
                Vehiculo.objects.create(
                    propietario=user,
                    placa=placa_final,
                    tipo_vehiculo=str(tipo_input).strip().upper() if tipo_input else "AUTOMOVIL"
                )
            
            return user

        except IntegrityError as e:
            if 'correo' in str(e).lower():
                raise serializers.ValidationError({"correo": "Este correo electrónico ya está registrado."})
            raise serializers.ValidationError({"error": f"Error de base de datos: {str(e)}"})


class LoginSerializer(serializers.Serializer):
    correo = serializers.EmailField(required=False)
    id_usuario = serializers.UUIDField(required=False)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, data):
        correo = data.get('correo')
        id_usuario = data.get('id_usuario')
        password = data.get('password')

        if not correo and not id_usuario:
            raise serializers.ValidationError("Debe proporcionar un correo o un id_usuario.")

        user = None
        if id_usuario:
            try:
                user = Usuario.objects.get(id_usuario=id_usuario)
            except Usuario.DoesNotExist:
                raise serializers.ValidationError("Usuario no encontrado.")
        elif correo:
            try:
                user = Usuario.objects.get(correo=correo)
            except Usuario.DoesNotExist:
                raise serializers.ValidationError("Credenciales incorrectas.")

        if user and not user.check_password(password):
            raise serializers.ValidationError("Credenciales incorrectas.")
        
        data['user'] = user
        return data


class BiometricLoginSerializer(serializers.Serializer):
    vector_biometrico = serializers.ListField(
        child=serializers.FloatField(),
        allow_empty=False,
        required=True
    )


class CoincidenciaUsuarioSerializer(serializers.ModelSerializer):
    rol = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = ['id_usuario', 'correo', 'nombre_completo', 'rol']

    def get_rol(self, obj):
        return 'administrador' if getattr(obj, 'rol', '') == 'admin' else getattr(obj, 'rol', 'Aprendiz')


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
        extra_kwargs = {
            'vehiculo': {'required': False, 'allow_null': True},
            'vigilante': {'required': False, 'allow_null': True}
        }

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
        if obj.vehiculo:
            return getattr(obj.vehiculo, 'tipo_vehiculo', 'AUTOMOVIL')
        return getattr(obj, 'tipo_vehiculo_manual', None) or "AUTOMOVIL"

    def get_fecha(self, obj):
        return obj.fecha_hora.date().strftime('%Y-%m-%d') if obj.fecha_hora else ""

    def get_hora(self, obj):
        return obj.fecha_hora.time().strftime('%H:%M') if obj.fecha_hora else ""

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
            if "RECHAZADO" in motivo_input.upper():
                return data 

            if placa_limpia:
                vehiculo_existente = Vehiculo.objects.annotate(
                    placa_sin_guion=Replace('placa', Value('-'), Value(''))
                ).filter(placa_sin_guion=placa_limpia, activo=True).first()

                data['vehiculo'] = vehiculo_existente
            else:
                data['vehiculo'] = None

            if "Apertura Manual" not in motivo_input:
                data['motivo_input'] = f"Apertura Manual - {motivo_input}".strip()

            return data
        
        es_visitante = "Visitante:" in motivo_input or "VISITANTE" in motivo_input.upper() or data.get('acreditacion') == 'VISITANTE'
        
        if placa_limpia:
            vehiculo_existente = Vehiculo.objects.annotate(
                placa_sin_guion=Replace('placa', Value('-'), Value(''))
            ).filter(placa_sin_guion=placa_limpia, propietario__is_active=True, activo=True).first()
            
            if vehiculo_existente:
                if es_visitante:
                    raise serializers.ValidationError(
                        f"Inconsistencia de seguridad: La placa '{placa_limpia}' ya está registrada a nombre del residente {vehiculo_existente.propietario.nombre_completo}."
                    )
                elif not vehiculo:
                    data['vehiculo'] = vehiculo_existente

        placa_a_validar = data.get('vehiculo').placa if data.get('vehiculo') else placa_limpia

        if placa_a_validar and placa_a_validar not in ['', 'S_PLACA', 'N/A'] and tipo_movimiento in ['ENTRADA', 'SALIDA']:
            placa_comparar = placa_a_validar.replace('-', '').upper()
            ultimo_registro = RegistroAcceso.objects.annotate(
                placa_m_sin_guion=Replace('placa_manual', Value('-'), Value('')),
                placa_v_sin_guion=Replace('vehiculo__placa', Value('-'), Value(''))
            ).filter(
                Q(placa_v_sin_guion=placa_comparar) | Q(placa_m_sin_guion=placa_comparar)
            ).order_by('-fecha_hora').first()

            if ultimo_registro and ultimo_registro.tipo_movimiento == tipo_movimiento:
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
            registro.placa_manual = placa if placa else (registro.vehiculo.placa if registro.vehiculo else "S_PLACA")
            
            tipo_veh = None
            if registro.vehiculo:
                tipo_veh = getattr(registro.vehiculo, 'tipo_vehiculo', 'AUTOMOVIL')
            
            registro.tipo_vehiculo_manual = tipo if tipo else (tipo_veh or "AUTOMOVIL")
            registro.nombre_conductor_manual = conductor if conductor else (registro.vehiculo.propietario.nombre_completo if registro.vehiculo else "VISITANTE TEMPORAL")
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


class UsuarioUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['nombre_completo', 'telefono', 'direccion', 'ficha']

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        campos_a_actualizar = list(validated_data.keys())
        instance.save(update_fields=campos_a_actualizar)
        return instance