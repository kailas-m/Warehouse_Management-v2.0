from rest_framework import serializers
from django.contrib.auth import authenticate


class CustomLoginSerializer(serializers.Serializer):
    """
    Serializer for custom login endpoint.
    Validates username and password credentials.
    """
    username = serializers.CharField(required=True, max_length=150)
    password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if not username or not password:
            raise serializers.ValidationError("Username and password are required.")
        
        return attrs
