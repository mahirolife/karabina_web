import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'jp';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  tEn: (key: string) => string;
  tJp: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Simple translations dictionary
const translations: Record<Language, Record<string, string>> = {
  en: {
    'nav.book': 'Book a table',
    'nav.book.desktop': 'Book a Table',
    'nav.book.mobile': 'Book',
    'nav.menu': 'Menu',
    'nav.opening': 'Opening hours',
    'nav.find': 'Find us',
    'nav.about': 'About us',
    'nav.contact': 'Contact',
    'booking.title': 'Make a Reservation',
    'booking.full_name': 'Full Name',
    'booking.email': 'Email Address',
    'booking.phone': 'Phone Number',
    'booking.party_size': 'Party Size',
    'booking.special_requests': 'Special Requests (Dietary habits, allergies, etc.)',
    'booking.confirm': 'Confirm Reservation',
    'booking.date': 'Reservation Date',
    'booking.cycle': 'Cycle Selection',
    'booking.cycle1': 'Cycle 1 (18:00)',
    'booking.cycle2': 'Cycle 2 (From 20:00)',
    'booking.success.title': 'Your reservation has been confirmed.',
    'booking.success.message': 'We look forward to welcoming you.',
    'booking.success.summary': 'Reservation Summary',
    'booking.success.name': 'Name:',
    'booking.success.date': 'Date:',
    'booking.success.time': 'Time:',
    'booking.success.guests': 'Guests:',
    'booking.success.note': 'Please note that your card will be charged ¥3,000 per person in the event of a late cancellation or no-show. A no-show is defined as not arriving within 30 minutes of your reservation time.',
    'booking.success.email_sent': 'A confirmation email has been sent to',
    'booking.success.cancel_via_email': 'To cancel your reservation, use the link in that email.',
    'booking.success.home': 'Back to Home',
    'booking.policy.title': 'Cancellation Policy',
    'booking.policy.en': 'A cancellation fee of ¥3,000 per person will be charged if a reservation is cancelled without at least 24 hours notice, or in the case of a no-show. Guests who have not arrived within 30 minutes of their reservation time will be considered a no-show.',
    'booking.policy.jp': '「24時間前までにキャンセルのご連絡がない場合、またはご来店がない場合には、お一人様につき¥3,000のキャンセル料を申し受けます。予約時間から30分以内にご来店がない場合はノーショーとみなされます。」',
    'booking.policy.agree': 'I understand and agree to the cancellation policy.',
    'booking.date_limit': 'Reservations can be made up to 3 months in advance.',
    'booking.large_group': 'For groups of 19 or more, please contact us directly by phone to make a reservation.',
    'booking.shared_table.notice': 'The only available table for your party size involves shared seating — you will be seated at a large table alongside another group. Would you still like to proceed?',
    'booking.shared_table.yes': 'Yes, confirm my reservation',
    'booking.shared_table.no': 'No, go back',
    'booking.placeholder.name': 'Karabina Niseko',
    'booking.placeholder.phone': '+81 90-1234-5678',
    'booking.placeholder.requests': 'E.g. Nut allergy, Celebrating a birthday...',
    'booking.cc.title': 'Credit Card Information',
    'booking.cc.desc': 'Your card details are processed directly by Square — Karabina never sees or stores them. You will not be charged now.',
    'booking.change_party': 'Change party size',
    'booking.party.person': 'Person',
    'booking.party.people': 'People',
    'booking.ssl': 'Secure 256-bit SSL encrypted reservation',
    'booking.summary.title': 'Details Summary',
    'booking.summary.client': 'Client',
    'booking.summary.schedule': 'Schedule',
    'booking.summary.party': 'Party Size',
    'booking.summary.guests': 'Guests',
    'booking.summary.requests': 'Special Requests',
    'booking.summary.warning': 'Cancellation Policy Warning',
    'booking.finalize': 'Finalize Reservation',
    'booking.confirming': 'Confirming...',
    'booking.back': 'Go Back',
    'booking.subtitle': 'Reserve your table at Karabina',
    'history.learn_more': 'Learn More',
    'nav.gift': 'Gift Cards',
    'hero.weather': 'Annupuri · Live Weather',
    'hero.loading': 'Loading weather...',
    'hero.unavailable': 'Weather currently unavailable',
    'hero.scroll': 'Keep scrolling for the good stuff.',
    'intro.1': 'Karabina is for laidback brekkies, catch-ups with friends, takeaway goodies, & days that you never want to end.',
    'intro.2': 'Set on Honeysuckle Drive with views onto Hunter River, Karabina welcomes guests from morning through to late afternoon.',
    'intro.3': 'You’ll find us tucked underneath Little National Hotel, serving an all-day brunch menu, baked treats, & damn good coffee.',
    'wavy.text': 'Karabina — Hidden Restaurant in the Mountain of Annupuri — ',
    'message.title': 'A Word from the Hearth',
    'message.text': 'Like a carabiner—built to connect.',
    'message.author': '-Karabina',
    'history.title': 'The Origin',
    'story.title': 'Our Story',
    'history.text': '50 years ago, long before Niseko became a world-famous ski destination, Karabina owner\'s father arrived here on a bicycle journey across Japan and decided to make this land his home. The buildings he constructed by hand still stand today, including the former family home that became Karabina.',
    'menu.more': 'Click here for full menu',
    'footer.contact': 'Contact',
    'footer.opening': 'Opening Hours',
    'footer.winter_only': 'Winter Only',
    'footer.daily': 'Daily',
    'footer.last_order': 'Last order at 10:00pm',
    'footer.find_us': 'Find Us',
    'footer.view_maps': 'View on Google Maps',
    'footer.credit': 'Design & Build by Mahiro Yamakawa',
  },
  jp: {
    'nav.book': '席を予約する',
    'nav.book.desktop': '予約する',
    'nav.book.mobile': '予約',
    'nav.menu': 'メニュー',
    'nav.opening': '営業時間',
    'nav.find': 'アクセス',
    'nav.about': '唐火七について',
    'nav.contact': 'お問い合わせ',
    'booking.title': 'ご予約フォーム',
    'booking.full_name': 'お名前',
    'booking.email': 'メールアドレス',
    'booking.phone': '電話番号',
    'booking.party_size': '人数',
    'booking.special_requests': 'ご要望（アレルギー、特別な日など）',
    'booking.confirm': '予約する',
    'booking.date': '予約日',
    'booking.cycle': '時間帯の選択',
    'booking.cycle1': '第1部 (18:00)',
    'booking.cycle2': '第2部 (20:00以降)',
    'booking.success.title': '予約が確定しました。',
    'booking.success.message': 'お客様のご来店を心よりお待ちしております。',
    'booking.success.summary': '予約内容',
    'booking.success.name': 'お名前：',
    'booking.success.date': '予約日：',
    'booking.success.time': '時間：',
    'booking.success.guests': '人数：',
    'booking.success.note': '24時間前までにキャンセルのご連絡がない場合、またはご来店がない場合には、お一人様につき¥3,000のキャンセル料を申し受けます。予約時間から30分以内にご来店がない場合もノーショーとみなされます。',
    'booking.success.email_sent': '予約確認メールを送信しました：',
    'booking.success.cancel_via_email': 'キャンセルをご希望の場合は、確認メールのリンクをご利用ください。',
    'booking.success.home': 'ホームに戻る',
    'booking.policy.title': 'キャンセルポリシー',
    'booking.policy.en': 'A cancellation fee of ¥3,000 per person will be charged if a reservation is cancelled without at least 24 hours notice, or in the case of a no-show. Guests who have not arrived within 30 minutes of their reservation time will be considered a no-show.',
    'booking.policy.jp': '「24時間前までにキャンセルのご連絡がない場合、またはご来店がない場合には、お一人様につき¥3,000のキャンセル料を申し受けます。予約時間から30分以内にご来店がない場合はノーショーとみなされます。」',
    'booking.policy.agree': 'キャンセルポリシーを理解し、同意します。',
    'booking.date_limit': '予約は3ヶ月先まで受け付けております。',
    'booking.large_group': '19名様以上のご予約は、お電話にて直接お問い合わせください。',
    'booking.shared_table.notice': 'ご指定の人数では、相席（大きなテーブルで他のお客様とご一緒）でのご案内となります。よろしいでしょうか？',
    'booking.shared_table.yes': 'はい、予約を確定します',
    'booking.shared_table.no': 'いいえ、戻ります',
    'booking.placeholder.name': '唐火七 ニセコ',
    'booking.placeholder.phone': '090-1234-5678',
    'booking.placeholder.requests': '例：ナッツアレルギー、誕生日のお祝い等...',
    'booking.cc.title': 'クレジットカード情報',
    'booking.cc.desc': 'カード情報はSquareが直接処理します。当店がカード情報を閲覧・保存することはありません。この時点での決済はありません。',
    'booking.change_party': '人数を変更する',
    'booking.party.person': '名',
    'booking.party.people': '名',
    'booking.ssl': '256ビットSSL暗号化による安全な予約',
    'booking.summary.title': '予約内容の確認',
    'booking.summary.client': 'お客様',
    'booking.summary.schedule': 'ご予約日時',
    'booking.summary.party': '人数',
    'booking.summary.guests': '名様',
    'booking.summary.requests': 'ご要望など',
    'booking.summary.warning': 'キャンセルポリシーに関するお願い',
    'booking.finalize': '予約を確定する',
    'booking.confirming': '処理中...',
    'booking.back': '戻る',
    'booking.subtitle': 'ご予約はこちらからどうぞ',
    'history.learn_more': '詳しく見る',
    'nav.gift': 'ギフトカード',
    'hero.weather': 'アンヌプリの空模様',
    'hero.loading': '天気を読み込み中...',
    'hero.unavailable': '現在天気情報は利用不可です',
    'hero.scroll': '下へスクロールして詳細を見る',
    'intro.1': '唐火七（カラビナ）は、ゆったりとした朝食、友人との語らい、テイクアウト、そして終わってほしくない一日のための場所です。',
    'intro.2': 'ハンター川を望むハニーサックル・ドライブに位置し、朝から夕方までお客様をお迎えします。',
    'intro.3': 'リトル・ナショナル・ホテルの下にひっそりと佇む当店では、オールデイ・ブランチ、焼き菓子、そして絶品コーヒーをご用意しています。',
    'wavy.text': '唐火七　ー　アンヌプリの麓に、ひっそり灯る小さなレストラン — ',
    'message.title': '囲炉裏からのメッセージ',
    'message.text': 'カラビナのように、つなぐために',
    'message.author': '-唐火七',
    'history.title': '軌跡',
    'story.title': 'ストーリー',
    'history.text': '50年以上前、ニセコが世界的なスキーリゾートになる前。この土地にたどり着いた一人の旅人がいました。',
    'menu.more': '全メニューはこちら',
    'footer.contact': 'お問い合わせ',
    'footer.opening': '営業時間',
    'footer.winter_only': '冬季限定',
    'footer.daily': '毎日営業',
    'footer.last_order': 'ラストオーダー 22:00',
    'footer.find_us': 'アクセス',
    'footer.view_maps': 'Googleマップで見る',
    'footer.credit': 'デザイン・制作：山川真広',
  }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string) => translations[language][key] || key;
  const tEn = (key: string) => translations['en'][key] || key;
  const tJp = (key: string) => translations['jp'][key] || key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tEn, tJp }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
