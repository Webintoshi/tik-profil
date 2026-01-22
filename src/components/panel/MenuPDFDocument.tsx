"use client";

import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font,
    Image,
} from "@react-pdf/renderer";
import { toR2ProxyUrl } from "@/lib/publicImage";

// Register fonts (using system fonts for Turkish character support)
Font.register({
    family: "Roboto",
    fonts: [
        { src: "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf", fontWeight: 400 },
        { src: "https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAx05IsDqlA.ttf", fontWeight: 700 },
    ],
});

// Styles
const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: "Roboto",
        backgroundColor: "#FFFFFF",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 30,
        paddingBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: "#8B5CF6",
    },
    logo: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 15,
    },
    businessName: {
        fontSize: 24,
        fontWeight: 700,
        color: "#1F2937",
    },
    slogan: {
        fontSize: 11,
        color: "#6B7280",
        marginTop: 4,
    },
    category: {
        marginBottom: 20,
    },
    categoryHeader: {
        backgroundColor: "#F3F4F6",
        padding: 10,
        marginBottom: 10,
        borderRadius: 4,
    },
    categoryName: {
        fontSize: 14,
        fontWeight: 700,
        color: "#374151",
        textTransform: "uppercase",
    },
    product: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    productInfo: {
        flex: 1,
        paddingRight: 15,
    },
    productName: {
        fontSize: 12,
        fontWeight: 700,
        color: "#1F2937",
        marginBottom: 2,
    },
    productDescription: {
        fontSize: 9,
        color: "#6B7280",
    },
    productPrice: {
        fontSize: 12,
        fontWeight: 700,
        color: "#8B5CF6",
    },
    footer: {
        position: "absolute",
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: "center",
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        paddingTop: 15,
    },
    footerText: {
        fontSize: 9,
        color: "#9CA3AF",
    },
    pageNumber: {
        fontSize: 9,
        color: "#9CA3AF",
        marginTop: 5,
    },
});

// Types - matching FBCategory and FBProduct from foodService
interface Category {
    id: string;
    name: string;
    order: number;
}

interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    category_id: string;
    in_stock: boolean;
}

interface MenuPDFDocumentProps {
    businessName: string;
    slogan?: string;
    logo?: string;
    categories: Category[];
    products: Product[];
}

// Format price helper
const formatPrice = (price: number): string => {
    return new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);
};

// Main PDF Document Component
export function MenuPDFDocument({
    businessName,
    slogan,
    logo,
    categories,
    products,
}: MenuPDFDocumentProps) {
    // Sort categories by order
    const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

    // Get products for a category (only in-stock)
    const getCategoryProducts = (categoryId: string) =>
        products.filter((p) => p.category_id === categoryId && p.in_stock);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    {logo && <Image src={toR2ProxyUrl(logo)} style={styles.logo} />}
                    <View>
                        <Text style={styles.businessName}>{businessName}</Text>
                        {slogan && <Text style={styles.slogan}>{slogan}</Text>}
                    </View>
                </View>

                {/* Categories & Products */}
                {sortedCategories.map((category) => {
                    const categoryProducts = getCategoryProducts(category.id);
                    if (categoryProducts.length === 0) return null;

                    return (
                        <View key={category.id} style={styles.category} wrap={false}>
                            <View style={styles.categoryHeader}>
                                <Text style={styles.categoryName}>{category.name}</Text>
                            </View>
                            {categoryProducts.map((product) => (
                                <View key={product.id} style={styles.product}>
                                    <View style={styles.productInfo}>
                                        <Text style={styles.productName}>{product.name}</Text>
                                        {product.description && (
                                            <Text style={styles.productDescription}>
                                                {product.description}
                                            </Text>
                                        )}
                                    </View>
                                    <Text style={styles.productPrice}>
                                        {formatPrice(product.price)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    );
                })}

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>
                        tikprofil.com ile oluşturuldu
                    </Text>
                </View>
            </Page>
        </Document>
    );
}
