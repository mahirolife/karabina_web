import { useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Nav } from '../components/Nav';
import { Footer } from '../components/Footer';
import { useLanguage } from '../context/LanguageContext';

const PARAGRAPHS_EN = [
  `Long before Niseko became known around the world for skiing and tourism, it was simply a quiet corner of Hokkaido surrounded by forests, mountains, and some of the purest water in Japan.`,
  `More than fifty years ago, the owner Mao's father arrived here during a bicycle journey around Japan. At the time, there were no ski resorts, no international visitors, and little indication of what Niseko would one day become. What captured his attention was the land itself—the beauty of the landscape and the quality of the water.`,
  `He decided to stay.`,
  `After purchasing the property, he built a home for his family by hand. Over the years, every building on the property was constructed by him, creating a place where generations of the family would live, work, and gather together.`,
  `The property grew to include what is now Karabina, Rakuichi, and the staff house, all connected by a shared story and a deep connection to this land.`,
  `For many years, the building that now houses Karabina was the home of Mao's grandmother. Then, 2002, Mao and his wife saw the opportunity to give the space a new life. They carefully renovated the family home and opened a restaurant of their own.`,
  `What began as a small family venture has continued ever since.`,
  `In a town that has changed rapidly over the years, Karabina remains something increasingly rare: a family-owned restaurant operating on family-owned land. While much of Niseko has transformed around it, the spirit of this place has remained remarkably consistent.`,
  `The name Karabina comes from the carabiner, a simple tool used in the mountains to connect ropes and people. For Mao, the name represented a vision for the restaurant, a place where connections are made.`,
  `That idea can be felt throughout the dining room. The space is intentionally intimate. Tables sit close together, conversations naturally flow between guests, and during busy evenings people often find themselves sharing space with someone they have never met before. Travelers, locals, seasonal workers, and friends gather under the same roof, often leaving with new connections and shared memories.`,
  `The atmosphere extends beyond the people. On cold Niseko nights, the warmth of the wood stove fills the room. The wooden interior reflects the history of the building, while the menu was created with the same goal in mind: to offer food that feels comforting, welcoming, and satisfying after a day spent in the mountains.`,
  `Everything about Karabina, from the building itself to the food that is served, was shaped by a simple idea: bringing people together.`,
  `Today, guests from around the world continue to gather here, just as generations of family members once did. What began with a bicycle journey and a love for this land has become a place where stories are shared, friendships are formed, and everyone is welcome.`,
  `We hope you'll become part of that story too.`,
];

const PARAGRAPHS_JP = [
  `ニセコが世界的なスキーリゾートとして知られるようになるずっと以前、ここはただ静かな北海道の一角でした。森と山々に囲まれ、日本でも有数の清らかな水が流れる場所です。`,
  `50年以上前、オーナーの真生さんの父が自転車で日本中を旅する途中、この地に辿り着きました。当時、スキーリゾートも外国人旅行者もなく、ニセコが今日のような姿になるとは誰も想像していませんでした。彼の心を掴んだのは、大地そのものでした。その景色の美しさと、水の豊かさです。`,
  `彼はここに留まることを決めました。`,
  `土地を購入した後、彼は家族のための家を自らの手で建てました。年月をかけ、敷地内のすべての建物が彼の手によって作られ、代々の家族が暮らし、働き、集う場所となっていきました。`,
  `その土地はやがて、現在の唐火七、楽一、そしてスタッフ宿舎を含む場所へと広がっていきました。それぞれが同じ物語と、この大地への深い繋がりで結ばれています。`,
  `長年にわたり、現在の唐火七が入る建物は、真生さんの祖母の家でした。そして2002年、真生さんと奥さんはこの空間に新しい命を吹き込む機会を見出しました。家族の家を丁寧にリノベーションし、自分たちのレストランをオープンしました。`,
  `小さな家族の挑戦として始まったものが、今日まで続いています。`,
  `急速に変化するこの町の中で、唐火七はますます稀な存在であり続けています。家族が所有する土地で、家族が営むレストラン。周囲のニセコが大きく変わっていく中でも、この場所の精神は変わらず守られています。`,
  `「唐火七（カラビナ）」という名前は、山でロープと人を繋ぐシンプルな道具、カラビナに由来しています。真生さんにとってこの名前は、レストランへのビジョンを表しています。人と人が繋がる場所。`,
  `そのアイデアはダイニング全体から伝わってきます。空間は意図的に親密に作られています。テーブルは近くに寄せられ、会話は自然にゲストの間に流れ、賑やかな夜にはまだ会ったことのない誰かと同じ空間を分かち合うことも少なくありません。旅人、地元の人々、季節労働者、そして友人たちが同じ屋根の下に集い、新たな繋がりと共有された思い出を持ち帰っていきます。`,
  `その雰囲気は人々だけにとどまりません。ニセコの寒い夜、薪ストーブの温かさが部屋中に広がります。木の内装は建物の歴史を物語り、メニューも同じ想いのもとに作られました。山で過ごした一日の後に、ほっとする、温かい、満ち足りた食事を届けること。`,
  `唐火七のすべて、建物そのものから提供される料理まで、シンプルなひとつの想いによって形作られています。人々を繋ぐこと。`,
  `今日も世界中からゲストがここに集まります。かつて何世代もの家族がそうしたように。自転車の旅とこの大地への愛から始まったものが、物語が分かち合われ、友情が生まれ、誰もが歓迎される場所となりました。`,
  `あなたにも、その物語の一部になっていただければと思います。`,
];

export default function StoryPage() {
  const { language, t } = useLanguage();
  const paragraphs = language === 'jp' ? PARAGRAPHS_JP : PARAGRAPHS_EN;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-cream text-brown selection:bg-orange selection:text-cream"
    >
      <Nav />

      <main className="pt-32 pb-24 lg:pt-48 lg:pb-32">
        <div className="container-custom max-w-2xl">

          <Link
            to="/"
            className="inline-flex items-center gap-2 group mb-12 lg:mb-20 opacity-60 hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="uppercase text-xs tracking-widest font-bold">
              {language === 'jp' ? 'ホームへ戻る' : 'Back to Home'}
            </span>
          </Link>

          <motion.header
            className="mb-16 lg:mb-24"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-[1px] bg-brown/20" />
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-orange">
                {t('history.title')}
              </span>
            </div>
            <h1
              className="text-4xl lg:text-6xl xl:text-7xl font-normal leading-tight text-brown"
              style={{ fontFamily: 'var(--font-display-heading)' }}
            >
              {t('story.title')}
            </h1>
          </motion.header>

          <div className="space-y-6 lg:space-y-8">
            {paragraphs.map((para, i) => (
              <motion.p
                key={`${language}-${i}`}
                className="text-base lg:text-lg leading-relaxed text-brown/80 font-light"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 + i * 0.04 }}
              >
                {para}
              </motion.p>
            ))}
          </div>

          <motion.div
            className="mt-16 lg:mt-24 pt-12 border-t border-brown/10 flex items-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="w-12 h-[1px] bg-orange/40" />
            <span className="text-[10px] uppercase tracking-[0.4em] text-orange/60 font-bold">
              Est. 2002 · Niseko
            </span>
          </motion.div>
        </div>
      </main>

      <Footer />
    </motion.div>
  );
}
