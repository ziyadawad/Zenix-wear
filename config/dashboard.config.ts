// إعدادات الداش بورد كلها في مكان واحد. غيّر هنا وارفع على GitHub، والداش بورد هيتحدث لوحده.

export const DASHBOARD_CONFIG = {
  // الصفحات اللي بتظهر فوق كتابات (tabs)، بالترتيب ده
  pages: [
    { id: 'overview', order: 1, title: 'الرئيسية', icon: 'LayoutDashboard', enabled: true }, // نظرة عامة على البيع النهارده والشهر
    { id: 'orders', order: 2, title: 'الأوردرات', icon: 'ShoppingCart', enabled: true }, // الأوردرات وحالاتها والمتأخر منها
    { id: 'stock', order: 3, title: 'المخزون', icon: 'Boxes', enabled: true }, // الكميات لكل مقاس ولون
    { id: 'money', order: 4, title: 'الفلوس', icon: 'Wallet', enabled: true }, // المحافظ والمصاريف والربح
    { id: 'products', order: 5, title: 'المنتجات', icon: 'Shirt', enabled: true }, // أكتر وأقل حاجة بتتباع
    { id: 'customers', order: 6, title: 'العملاء', icon: 'Users', enabled: true }, // العملاء والمحافظات
  ],

  refreshSeconds: 30, // كل كام ثانية الأرقام تتحدث لوحدها
  tvRotateSeconds: 20, // في وضع الشاشة: كل كام ثانية يقلب على الصفحة اللي بعدها

  lowStock: {
    default: 3, // لو الكمية في مقاس/لون أقل من الرقم ده يطلع تنبيه "محتاج نزوّد"
    perProduct: {} as Record<string, number>, // حد مختلف لمنتج معين: { 'zenix-crew-socks': 5 } (الاسم من رابط المنتج)
  },

  late: {
    confirmedDays: 2, // أوردر اتأكد ومتشحنش بعد العدد ده من الأيام = متأخر
    shippedDays: 5, // أوردر اتشحن ومتسلمش بعد العدد ده من الأيام = متأخر
    unconfirmedHours: 2, // أوردر جديد مستني تأكيد أكتر من كام ساعة = أحمر
  },

  risk: {
    badOrders: 2, // العميل اللي عنده العدد ده أو أكتر من أوردرات ملغية/مرتجعة يتعلّم بالأحمر
  },

  monthlySalesTarget: 100000, // تارجت المبيعات في الشهر بالجنيه

  // المحافظ/الحسابات اللي الفلوس بتدخل فيها. متغيّرش الـ id بعد ما تبدأ تستخدمها
  wallets: [
    { id: 'cash', name: 'كاش' }, // فلوس في إيدك
    { id: 'vodafone', name: 'فودافون كاش' }, // محفظة فودافون كاش
    { id: 'instapay', name: 'إنستاباي' }, // تحويلات إنستاباي
    { id: 'bank', name: 'البنك' }, // الحساب البنكي (والدفع بالكارت)
    { id: 'courier', name: 'فلوس عند شركة الشحن' }, // كاش الأوردرات اللي اتسلمت ولسه شركة الشحن مسلمتهاش
  ],

  // كل طريقة دفع في الموقع فلوسها بتنزل في أنهي محفظة
  paymentWallet: {
    cod: 'courier', // الدفع عند الاستلام: بيفضل عند شركة الشحن لحد ما يحوّلوه
    instapay: 'instapay', // إنستاباي
    wallet: 'vodafone', // محفظة موبايل
    card: 'bank', // كارت (Paymob)
  } as Record<string, string>,

  // أنواع المصاريف اللي بتختار منها وانت بتسجل مصروف
  expenseCategories: ['إعلانات', 'شحن', 'تغليف', 'تصنيع وقماش', 'مرتبات', 'أخرى'],

  // حالات الأوردر بالترتيب، واسم كل حالة واللون بتاعها
  orderStatuses: [
    { id: 'pending', label: 'جديد', tone: 'warn' }, // لسه واصل ومحتاج تأكيد
    { id: 'confirmed', label: 'اتأكد', tone: 'info' }, // العميل أكد
    { id: 'preparing', label: 'بيتجهز', tone: 'info' }, // بيتغلف
    { id: 'shipped', label: 'اتشحن', tone: 'info' }, // مع شركة الشحن
    { id: 'delivered', label: 'اتسلم', tone: 'good' }, // وصل للعميل
    { id: 'returned', label: 'مرتجع', tone: 'bad' }, // رجع (المخزون بيرجع لوحده)
    { id: 'cancelled', label: 'اتلغى', tone: 'bad' }, // اتلغى (المخزون بيرجع لوحده)
  ],

  colors: {
    good: '#3bb273', // أخضر: فلوس داخلة / اتسلم / تمام
    bad: '#e5484d', // أحمر: مشكلة / فلوس خارجة / متأخر / خلصان
    warn: '#e9bd67', // أصفر: محتاج انتباه
    info: '#94c0ff', // أزرق: في السكة
    neutral: '#a1a1a1', // رمادي: عادي
  },
} as const;

export type DashboardPageId = (typeof DASHBOARD_CONFIG.pages)[number]['id'];
