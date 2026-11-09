import 'server-only';
import type { Locale } from '../types';

type Section = { h: string; p: string[] };
export interface LegalDoc { title: string; intro: string; sections: Section[] }
const doc = (title: string, intro: string, sections: [string, ...string[]][]): LegalDoc => ({ title, intro, sections: sections.map(([h, ...p]) => ({ h, p })) });

const contactEn = 'WhatsApp or phone: 01003965158. Email: ziyadawad14@gmail.com.';
const contactAr = 'واتساب أو تليفون: 01003965158. الإيميل: ziyadawad14@gmail.com.';

export const LEGAL: Record<string, Record<Locale, LegalDoc>> = {
  'shipping-policy': {
    en: doc('Shipping Policy', 'We deliver to all 27 governorates of Egypt.', [
      ['Delivery time', 'Orders are confirmed by phone or WhatsApp and normally arrive within 2 to 5 working days. Remote areas may take a little longer. Delivery does not take place on official holidays.'],
      ['Shipping fees', 'The fee depends on your governorate and is shown at checkout before you confirm your order.', 'Orders over the free-shipping threshold shown on the site ship free.'],
      ['Receiving your order', 'Our courier will call you before delivery, so please keep your phone available. You are welcome to inspect the item before paying the courier.', 'If delivery fails after several attempts, the order may be cancelled.'],
      ['Track your order', 'Use the Track Order page with your order number and phone number at any time.'],
    ]),
    ar: doc('سياسة الشحن', 'بنوصل لكل محافظات مصر الـ ٢٧.', [
      ['التوصيل بياخد قد إيه', 'بنأكد الأوردر معاك على التليفون أو واتساب، وعادةً بيوصل في خلال ٢ لـ ٥ أيام شغل. المناطق البعيدة ممكن تاخد وقت أطول شوية. مفيش توصيل في الإجازات الرسمية.'],
      ['مصاريف الشحن', 'المصاريف على حسب المحافظة، وبتظهرلك قبل ما تأكد الأوردر.', 'الأوردرات اللي بتعدي حد الشحن المجاني المكتوب في الموقع شحنها مجاني.'],
      ['استلام الأوردر', 'المندوب هيكلمك قبل ما يوصل، فخلي موبايلك جنبك. وتقدر تشوف القطعة قبل ما تدفع للمندوب.', 'لو التوصيل منفعش بعد كذا محاولة، ممكن الأوردر يتلغي.'],
      ['متابعة الأوردر', 'تقدر تتابع الأوردر في أي وقت من صفحة «تابع الأوردر» برقم الأوردر ورقم الموبايل.'],
    ]),
  },
  'exchange-policy': {
    en: doc('Exchange & Return Policy', 'You have 14 days from the day you receive your order to exchange or return it.', [
      ['Conditions', 'The item must be unworn, unwashed and in its original condition, with all tags attached.'],
      ['How to request an exchange', `Contact us within 14 days with your order number and the size or item you want. ${contactEn}`],
      ['Fees', 'If the item is faulty or we sent the wrong item, we cover all shipping. For a change of size or mind, the customer pays the shipping fee.'],
      ['Refunds', 'Once we receive and inspect a returned item, the refund is sent to your wallet or by the original payment method within 7 to 14 working days. Original shipping fees are not refundable unless the error was ours.'],
    ]),
    ar: doc('سياسة التبديل والاسترجاع', 'قدامك ١٤ يوم من يوم ما الأوردر يوصلك تبدّل أو ترجّع.', [
      ['الشروط', 'لازم القطعة متكونش اتلبست ولا اتغسلت، وتكون زي ما هي وبكل التيكتات.'],
      ['تطلب التبديل إزاي', `كلمنا في خلال ١٤ يوم برقم الأوردر والمقاس أو القطعة اللي عايزها. ${contactAr}`],
      ['المصاريف', 'لو فيه عيب في القطعة أو وصلك حاجة غلط، إحنا بنتحمل كل مصاريف الشحن. لو هتغيّر المقاس أو غيرت رأيك، مصاريف الشحن عليك.'],
      ['رجوع الفلوس', 'بعد ما القطعة توصلنا ونراجعها، بنرجعلك الفلوس على محفظتك أو بنفس طريقة الدفع في خلال ٧ لـ ١٤ يوم شغل. مصاريف الشحن الأصلية مبترجعش إلا لو الغلط مننا.'],
    ]),
  },
  privacy: {
    en: doc('Privacy Policy', 'We collect only what we need to serve you, and we never sell your data.', [
      ['What we collect', 'Your name, phone numbers, email, delivery address, order history, payment-transfer screenshots if you pay by transfer, and basic analytics about how the site is used.'],
      ['How we use it', 'To process and deliver orders, contact you about your order, handle exchanges, send offers if you subscribed, and improve the site.'],
      ['Who we share it with', 'Only those who help us serve you: couriers, payment providers, hosting and email providers, and, if enabled, analytics and advertising platforms (Meta, TikTok, Google).'],
      ['Card payments', 'Card details are entered on Paymob’s secure page. They never reach or get stored on our servers.'],
      ['Your rights', `You can ask us to view, correct or delete your personal data at any time. ${contactEn}`],
    ]),
    ar: doc('سياسة الخصوصية', 'بناخد اللي محتاجينه بس عشان نخدمك، ومبنبيعش بياناتك أبدًا.', [
      ['بناخد إيه', 'الاسم، أرقام الموبايل، الإيميل، عنوان التوصيل، الأوردرات اللي عملتها، صور التحويل لو دفعت بالتحويل، وإحصائيات عامة عن استخدام الموقع.'],
      ['بنستخدمها في إيه', 'عشان ننفذ الأوردرات ونوصلها، نكلمك بخصوص الأوردر، نخلص التبديل، نبعتلك العروض لو اشتركت، ونحسّن الموقع.'],
      ['بنشاركها مع مين', 'اللي بيساعدونا نخدمك بس: شركات الشحن، شركات الدفع، الاستضافة والإيميل، ومنصات التحليل والإعلانات لو شغالة (Meta وTikTok وGoogle).'],
      ['الدفع بالكارت', 'بيانات الكارت بتتكتب في صفحة Paymob الآمنة، ومبتوصلش لسيرفراتنا ولا بتتخزن عندنا.'],
      ['حقوقك', `تقدر تطلب تشوف بياناتك أو تعدلها أو تمسحها في أي وقت. ${contactAr}`],
    ]),
  },
  terms: {
    en: doc('Terms & Conditions', 'By using this site or placing an order, you agree to the terms below.', [
      ['Orders', 'An order is a request to buy. It is confirmed once we contact you or update its status. We may cancel an order in case of a pricing error, unavailable stock, or details we cannot verify.'],
      ['Prices and payment', 'All prices are in Egyptian Pounds. Shipping is added at checkout. Available payment methods are shown at checkout. Orders paid by transfer are processed after the transfer is verified.'],
      ['Products', 'We show colours as accurately as we can, but they may vary slightly by screen. Measurements may differ by 1 to 2 cm.'],
      ['Intellectual property', 'The ZENIX WEAR name, logos, designs, photos and content belong to ZENIX WEAR and may not be used without written permission.'],
      ['Governing law', 'These terms are governed by the laws of the Arab Republic of Egypt.'],
    ]),
    ar: doc('الشروط والأحكام', 'لما تستخدم الموقع أو تعمل أوردر، تبقى موافق على الشروط دي.', [
      ['الأوردرات', 'الأوردر هو طلب شراء، وبيتأكد لما نكلمك أو نحدّث حالته. من حقنا نلغي الأوردر لو فيه غلطة في السعر، أو القطعة مش متاحة، أو البيانات مش قادرين نتأكد منها.'],
      ['الأسعار والدفع', 'كل الأسعار بالجنيه المصري، والشحن بيتضاف قبل تأكيد الأوردر. طرق الدفع المتاحة بتظهرلك وإنت بتكمل الأوردر. الأوردرات المدفوعة بالتحويل بنجهزها بعد ما نتأكد من التحويل.'],
      ['المنتجات', 'بنعرض الألوان أقرب ما يمكن للحقيقة، بس ممكن تختلف شوية على حسب الشاشة. المقاسات ممكن تفرق من ١ لـ ٢ سم.'],
      ['حقوق الملكية', 'اسم ZENIX WEAR واللوجوهات والتصميمات والصور والمحتوى ملك ZENIX WEAR، وممنوع استخدامها من غير إذن مكتوب.'],
      ['القانون', 'الشروط دي ماشية على قوانين جمهورية مصر العربية.'],
    ]),
  },
};

export const FAQ: Record<Locale, [string, string][]> = {
  en: [
    ['How long does delivery take?', 'Normally 2 to 5 working days, depending on your governorate.'],
    ['Do you offer cash on delivery?', 'Yes, all over Egypt.'],
    ['What payment methods do you accept?', 'Cash on delivery, InstaPay and mobile wallets such as Vodafone Cash. Card payments will be available soon.'],
    ['Can I exchange an item?', 'Yes, within 14 days, as long as it is unworn with its tags on. Message us on WhatsApp to start.'],
    ['How do I choose my size?', 'Open the Size Guide on any product page. It has measurements in centimetres and a fit tip for that piece.'],
    ['How much is shipping?', 'The fee depends on your governorate and appears at checkout. Orders over the free-shipping threshold ship free.'],
    ['Do I need an account to order?', 'No. Guest checkout takes under a minute. An account simply makes tracking and reordering easier.'],
    ['Do you have a physical store?', 'No. ZENIX WEAR is online only, which lets us focus everything on the product and the delivery.'],
    ['How do I track my order?', 'Use the Track Order page with your order number and phone number.'],
  ],
  ar: [
    ['التوصيل بياخد قد إيه؟', 'عادةً من ٢ لـ ٥ أيام شغل على حسب المحافظة.'],
    ['فيه دفع عند الاستلام؟', 'أيوه، في كل مصر.'],
    ['بتقبلوا الدفع بإيه؟', 'الدفع عند الاستلام، إنستاباي، والمحافظ زي فودافون كاش. والدفع بالكارت قريب.'],
    ['ينفع أبدّل القطعة؟', 'أيوه، في خلال ١٤ يوم بشرط متكونش اتلبست وبالتيكت بتاعها. كلمنا على واتساب ونبدأ.'],
    ['أختار مقاسي إزاي؟', 'افتح دليل المقاسات في صفحة أي قطعة. هتلاقي المقاسات بالسنتي ونصيحة للمقاس.'],
    ['الشحن بكام؟', 'على حسب المحافظة وبيظهرلك قبل ما تأكد الأوردر. والأوردرات اللي بتعدي حد الشحن المجاني شحنها مجاني.'],
    ['لازم أعمل حساب عشان أطلب؟', 'لأ. تقدر تطلب من غير حساب في أقل من دقيقة. الحساب بس بيسهّل المتابعة والطلب تاني.'],
    ['عندكم فرع؟', 'لأ. ZENIX WEAR أونلاين بس، وده بيخلينا نركز على القطعة والتوصيل.'],
    ['أتابع الأوردر إزاي؟', 'من صفحة «تابع الأوردر» برقم الأوردر ورقم الموبايل.'],
  ],
};
