from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.cache import cache
from django.utils.crypto import get_random_string
from django.conf import settings
from django.core.mail import send_mail
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.db.models import Q
import random
User = get_user_model()

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'password', 'password_confirm', 'first_name', 'last_name']
        read_only_fields = ['id']

    def validate_username(self, value):
        if '@' in value:
            raise serializers.ValidationError("Символ '@' запрещен в имени пользователя.")
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Пользователь с таким именем уже существует.")
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Пароли не совпадают"})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        
        self.send_activation_email(user)
        
        return user

    @staticmethod
    def send_activation_email(user):
        code = str(random.randint(100000, 999999))

        cache.set(f"email_verify:{user.email}", code, timeout=settings.EMAIL_VERIFICATION_TIMEOUT)
        
        send_mail(
            'Код активации',
            f'Привет, {user.username}! Твой код подтверждения: {code}',
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['email'] = serializers.CharField(required=False, write_only=True)
        self.fields['login'] = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        login_input = attrs.get('login')
        password = attrs.get('password')

        if not login_input:
            raise serializers.ValidationError({"login": "Это поле обязательно."})

        user = None
        if '@' in login_input:
            try:
                user = User.objects.get(email=login_input)
            except User.DoesNotExist:
                pass
        else:
            try:
                user = User.objects.get(username=login_input)
            except User.DoesNotExist:
                pass

        if user:
            if not user.is_active:
                raise serializers.ValidationError({"detail": "Аккаунт не активирован."})
            
            attrs['email'] = user.email
            
        data = super().validate(attrs)
        
        data['user'] = {
            'id': user.id,
            'email': user.email,
            'username': user.username,
            'full_name': f"{user.first_name} {user.last_name}".strip()
        }
        
        return data




class UserSerializer(serializers.ModelSerializer):    
    full_name = serializers.ReadOnlyField()
    
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'full_name', 'is_active', 'date_joined']
        read_only_fields = ['id', 'email', 'date_joined', 'is_active']


class PasswordChangeSerializer(serializers.Serializer):    
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True, write_only=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password": "Пароли не совпадают"})
        return attrs
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Неверный текущий пароль")
        return value
    
    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    """Запрос на сброс пароля"""
    
    email = serializers.EmailField(required=True)
    
    def validate_email(self, value):
        try:
            User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("Пользователь с таким email не найден")
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Подтверждение сброса пароля"""
    
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True, write_only=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password": "Пароли не совпадают"})
        return attrs
