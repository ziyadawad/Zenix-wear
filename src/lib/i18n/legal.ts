import 'server-only';
import type { Locale } from '../types';

type Section = { h: string; p: string[] };
export interface LegalDoc { title: string; intro: string; sections: Section[] }
const doc = (title: string, intro: string, sections: [string, ...string[]][]): LegalDoc => ({ title, intro, sections: sections.map(([h, ...p]) => ({ h, p })) });

const contactEn = 'WhatsApp or phone: 01003965158. Email: ziyadawad14@gmail.com.';
const contactAr = 'واتساب أو هاتف: 01003965158. البريد الإلكتروني: ziyadawad14@gmail.com.';

export const LEGAL: Record<string, Record<Locale, LegalDoc>> = {
  'shipping-policy': {
    en: doc('Shipping Policy', 'We deliver to all 27 governorates of Egypt.', [
      ['Delivery time', 'Orders are confirmed by phone or WhatsApp and normally arrive within 2 to 5 working days. Remote areas may take a little longer. Delivery does not take place on official holidays.'],
      ['Shipping fees', 'The fee depends on your governorate and is shown at checkout before you confirm your order.', 'Orders over the free-shipping threshold shown on the site ship free.'],
      ['Receiving your order', 'Our courier will call you before delivery, so please keep your phone available. You are welcome to inspect the item before paying the courier.', 'If delivery fails after several attempts, the order may be cancelled.'],
      ['Track your order', 'Use the Track Order page with your order number and phone number at any time.'],
    ]),
    ar: doc('سياسة الشحن', 'بنوصل لكل محافظات مصر الـ ٢٧.', [
      ['مدة التوصيل', 'بيتم تأكيد الطلب عن طريق الهاتف أو واتساب، وعادةً بيوصل خلال ٢ إلى ٥ أيام عمل. المناطق البعيدة ممكن تاخد وقت أطول شوية. لا يتم التوصيل في الإجازات الرسمية.'],
      ['مصاريف الشحن', 'المصاريف بتتحدد حسب المحافظة وبتظهر عند إتمام الطلب قبل التأكيد.', 'الطلبات اللي تعدي حد الشحن المجاني الموضح في الموقع شحنها مجاني.'],
      ['استلام الطلب', 'مندوب الشحن هيتصل بيك قبل التوصيل، فمن فضلك خلي موبايلك متاح. تقدر تعاين المنتج قبل الدفع للمندوب.', 'لو التوصيل فشل بعد أكتر من محاولة، ممكن يتم إلغاء الطلب.'],
      ['تتبع الطلب', 'تقدر تتابع طلبك في أي وقت من صفحة تتبع الطلب برقم الطلب ورقم الموبايل.'],
    ]),
  },
  'exchange-policy': {
    en: doc('Exchange & Return Policy', 'You have 14 days from the day you receive your order to exchange or return it.', [
      ['Conditions', 'The item must be unworn, unwashed and in its original condition, with all tags attached.', 'For hygiene reasons, socks and other intimate items can be exchanged only if unopened and in their original packaging.'],
      ['How to request an exchange', `Contact us within 14 days with your order number and the size or item you want. ${contactEn}`],
      ['Fees', 'If the item is faulty or we sent the wrong item, we cover all shipping. For a change of size or mind, the customer pays the shipping fee.'],
      ['Refunds', 'Once we receive and inspect a returned item, the refund is sent to your wallet or by the original payment method within 7 to 14 working days. Original shipping fees are not refundable unless the error was ours.'],
    ]),
    ar: doc('سياسة الاستبدال والاسترجاع', 'عندك ١٤ يوم من يوم استلام طلبك للاستبدال أو الاسترجاع.', [
      ['الشروط', 'لازم تكون القطعة غير ملبوسة وغير مغسولة وبحالتها الأصلية، وبكل التيكتات.', 'لأسباب صحية، الشرابات وما شابهها لا تُستبدل إلا لو مقفولة في تغليفها الأصلي.'],
      ['طريقة طلب الاستبدال', `كلمنا خلال ١٤ يوم برقم الطلب والمقاس أو المنتج اللي عايزه. ${contactAr}`],
      ['المصاريف', 'لو في عيب في المنتج أو وصلك منتج غلط، بنتحمل كل مصاريف الشحن. أما تغيير المقاس أو الرأي فمصاريف الشحن على العميل.'],
      ['رد المبلغ', 'بعد استلام القطعة وفحصها، بيتم رد المبلغ على محفظتك أو بوسيلة الدفع الأصلية خلال ٧ إلى ١٤ يوم عمل. مصاريف الشحن الأصلية لا تُرد إلا لو الخطأ من طرفنا.'],
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
    ar: doc('سياسة الخصوصية', 'بنجمع اللي محتاجينه بس عشان نخدمك، ومش بنبيع بياناتك أبدًا.', [
      ['البيانات اللي بنجمعها', 'الاسم، أرقام الموبايل، البريد الإلكتروني، عنوان التوصيل، سجل الطلبات، صور التحويل لو الدفع بالتحويل، وإحصائيات عامة عن استخدام الموقع.'],
      ['بنستخدمها في إيه', 'تنفيذ الطلبات وتوصيلها، التواصل معاك بخصوص طلبك، الاستبدال، إرسال العروض لو اشتركت، وتحسين الموقع.'],
      ['مع مين بنشاركها', 'الجهات اللي بتساعدنا نخدمك فقط: شركات الشحن، مقدمو خدمات الدفع، الاستضافة والبريد، ومنصات التحليل والإعلانات لو تم تفعيلها (Meta وTikTok وGoogle).'],
      ['الدفع بالبطاقة', 'بيانات البطاقة بتتكتب في صفحة Paymob الآمنة، ومش بتوصل لسيرفراتنا أو تتخزن عندنا.'],
      ['حقوقك', `تقدر تطلب الاطلاع على بياناتك أو تعديلها أو حذفها في أي وقت. ${contactAr}`],
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
    ar: doc('الشروط والأحكام', 'باستخدامك للموقع أو عمل طلب، إنت موافق على الشروط دي.', [
      ['الطلبات', 'الطلب هو رغبة في الشراء، وبيتأكد لما نتواصل معاك أو نحدّث حالته. من حقنا نلغي الطلب في حالة خطأ في السعر، أو عدم توفر المنتج، أو بيانات لا يمكن التحقق منها.'],
      ['الأسعار والدفع', 'كل الأسعار بالجنيه المصري، والشحن بيتضاف عند إتمام الطلب. وسائل الدفع المتاحة بتظهر عند إتمام الطلب. الطلبات المدفوعة بالتحويل بيتم تنفيذها بعد التأكد من التحويل.'],
      ['المنتجات', 'بنعرض الألوان بأدق شكل ممكن، لكنها ممكن تختلف بسيطًا حسب الشاشة. القياسات ممكن تختلف من ١ إلى ٢ سم.'],
      ['الملكية الفكرية', 'اسم ZENIX WEAR والشعارات والتصميمات والصور والمحتوى ملك ZENIX WEAR، ولا يجوز استخدامها بدون إذن كتابي.'],
      ['القانون', 'تخضع هذه الشروط لقوانين جمهورية مصر العربية.'],
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
    ['التوصيل بياخد قد إيه؟', 'عادةً من ٢ إلى ٥ أيام عمل حسب المحافظة.'],
    ['فيه دفع عند الاستلام؟', 'أيوه، في كل مصر.'],
    ['إيه وسائل الدفع المتاحة؟', 'الدفع عند الاستلام، إنستاباي، والمحافظ الإلكترونية زي فودافون كاش. والدفع بالبطاقة قريبًا.'],
    ['ينفع أستبدل المنتج؟', 'أيوه، خلال ١٤ يوم بشرط أن يكون غير ملبوس وبالتيكت. كلمنا على واتساب عشان نبدأ.'],
    ['أختار مقاسي إزاي؟', 'افتح دليل المقاسات في صفحة أي منتج. هتلاقي القياسات بالسنتيمتر ونصيحة للمقاس.'],
    ['الشحن بكام؟', 'حسب المحافظة وبيظهر عند إتمام الطلب. والطلبات اللي تعدي حد الشحن المجاني شحنها مجاني.'],
    ['لازم أعمل حساب عشان أطلب؟', 'لا. تقدر تطلب كضيف في أقل من دقيقة. الحساب بس بيسهل التتبع وإعادة الطلب.'],
    ['عندكم فرع؟', 'لا. ZENIX WEAR أونلاين فقط، وده بيخلينا نركز كل حاجة على المنتج والتوصيل.'],
    ['أتابع طلبي إزاي؟', 'من صفحة تتبع الطلب برقم الطلب ورقم الموبايل.'],
  ],
};
