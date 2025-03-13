from django.db import models

class Measurement(models.Model):
    image = models.ImageField(upload_to='images/')
    width = models.FloatField(null=True)
    height = models.FloatField(null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Measurement {self.id}"