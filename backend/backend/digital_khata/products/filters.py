import django_filters

from products.models import Product


class ProductFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(field_name='name', lookup_expr='icontains')
    category = django_filters.NumberFilter(field_name='category__id')

    min_selling_price = django_filters.NumberFilter(field_name='selling_price', lookup_expr='gte')
    max_selling_price = django_filters.NumberFilter(field_name='selling_price', lookup_expr='lte')

    min_cost_price = django_filters.NumberFilter(field_name='cost_price', lookup_expr='gte')
    max_cost_price = django_filters.NumberFilter(field_name='cost_price', lookup_expr='lte')

    min_stock = django_filters.NumberFilter(field_name='stock', lookup_expr='gte')
    max_stock = django_filters.NumberFilter(field_name='stock', lookup_expr='lte')


    in_stock = django_filters.BooleanFilter(method='filter_in_stock')

    class Meta:
        model = Product
        fields = []

        def filter_in_stock(self, queryset, name, value):
            if value:
                return queryset.filter(stock__gt=0)
            else:
                return queryset.filter(stock__lte=0)
            return queryset