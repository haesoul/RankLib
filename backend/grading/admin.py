from django.contrib import admin

from .models import *


admin.site.register(UserWorkspace)
admin.site.register(GlobalClass)
admin.site.register(ClassOfGrading)
admin.site.register(GradeObject)
admin.site.register(RankType)
admin.site.register(Tag)
admin.site.register(Category)

admin.site.register(SubCategory)
admin.site.register(MediaItem)
admin.site.register(Note)

admin.site.register(Proof)


admin.site.register(CategoryOfObject)

admin.site.register(SubCategoryOfObject)
admin.site.register(ObjectTag)
admin.site.register(ClassRankType)

admin.site.register(ClassTag)




