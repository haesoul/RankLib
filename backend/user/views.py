from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.utils.crypto import get_random_string
from django.core.mail import send_mail
from django.conf import settings

from user.serializers import (
    UserRegistrationSerializer, UserSerializer, PasswordChangeSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer
)
from grading.models import UserWorkspace

from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django.core.cache import cache
from django.utils import timezone
from django.conf import settings
from django.contrib.auth import get_user_model

from .serializers import (
    UserRegistrationSerializer, CustomTokenObtainPairSerializer
)
from grading.models import UserWorkspace

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = UserRegistrationSerializer
    
    def perform_create(self, serializer):
        user = serializer.save()
        UserWorkspace.objects.create(user=user)

class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('code')
        
        if not email or not code:
            return Response({"detail": "Email и код обязательны."}, status=status.HTTP_400_BAD_REQUEST)

        cached_code = cache.get(f"email_verify:{email}")
        
        if not cached_code or cached_code != str(code):
            return Response(
                {"detail": "Неверный код или срок его действия истек."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
            user.is_active = True
            user.save() 
            
            cache.delete(f"email_verify:{email}")
            
            return Response({"detail": "Email успешно подтвержден."}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"detail": "Пользователь не найден."}, status=status.HTTP_404_NOT_FOUND)
        


class ResendVerificationEmailView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        try:
            user = User.objects.get(email=email)
            if user.is_active:
                return Response({"detail": "Аккаунт уже активен."}, status=status.HTTP_400_BAD_REQUEST)
            
            UserRegistrationSerializer.send_activation_email(user)
            
            return Response({"detail": "Письмо отправлено."}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"detail": "Пользователь не найден."}, status=status.HTTP_404_NOT_FOUND)

class CustomLoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer



class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh_token')
            token = RefreshToken(refresh_token)
            token.blacklist()
            
            return Response(
                {"detail": "Успешный выход"},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"detail": "Ошибка при выходе"},
                status=status.HTTP_400_BAD_REQUEST
            )


class CurrentUserView(generics.RetrieveUpdateAPIView):    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer
    
    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"detail": "Пароль успешно изменен"},
                status=status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        
        if serializer.is_valid():
            email = serializer.validated_data['email']
            user = User.objects.get(email=email)
            
            token = get_random_string(64)
            user.email_verification_token = token
            user.save()
            reset_link = f"{settings.DOMAIN}/api/auth/password-reset-confirm/{token}/"
            
            send_mail(
                'Сброс пароля',
                f'Для сброса пароля перейдите по ссылке: {reset_link}',
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
            
            return Response(
                {"detail": "Письмо со ссылкой для сброса пароля отправлено"},
                status=status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(APIView):    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        
        if serializer.is_valid():
            token = serializer.validated_data['token']
            new_password = serializer.validated_data['new_password']
            
            try:
                user = User.objects.get(email_verification_token=token)
                user.set_password(new_password)
                user.email_verification_token = None
                user.save()
                
                return Response(
                    {"detail": "Пароль успешно изменен"},
                    status=status.HTTP_200_OK
                )
                
            except User.DoesNotExist:
                return Response(
                    {"detail": "Неверный токен"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def delete_account(request):
    
    user = request.user
    user.delete()
    
    return Response(
        {"detail": "Аккаунт успешно удален"},
        status=status.HTTP_204_NO_CONTENT
    )
