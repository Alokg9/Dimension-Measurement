# measurement/urls.py
from django.urls import path
app_name = 'measurement'

urlpatterns = [
    path('', views.home, name='home'),
    path('video_feed/', views.video_feed, name='video_feed'),
    path('captures/', views.capture_and_measure, name='captures'),
    path('calibrate/', views.calibrate, name='calibrate'),
]
