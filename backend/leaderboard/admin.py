from django.contrib import admin

from .models import *


admin.site.register(GlobalObject)

admin.site.register(GlobalLeaderboard)

admin.site.register(UserObjectContribution)
admin.site.register(GlobalCategoryLeaderboard)
admin.site.register(TrendingObject)
admin.site.register(UserRatingHistory)

admin.site.register(PopularTag)
