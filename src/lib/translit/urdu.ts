/**
 * Urdu (Perso-Arabic script) → Hindi (Devanagari) transliteration.
 *
 * Urdu and Hindi are the same language in two scripts, so for prose like the
 * hadith corpus this is transliteration rather than translation. That makes it
 * a rules problem, and rules have the properties that matter here: identical
 * output every run, reviewable as a diff, no API, no cost — the same reasons
 * scripts/fix-devanagari.ts beat a model at repairing Devanagari.
 *
 * THE HARD PART is that Urdu orthography omits short vowels. `کتاب` writes k-t-
 * ā-b and the reader supplies "kitāb"; nothing in the string distinguishes it
 * from "kutub". No letter-level rule can recover that, so the design is:
 *
 *   1. LEXICON — exact word → Devanagari. Authoritative, and the only way to
 *      get short vowels right. Cheap to extend, and every entry improves the
 *      whole corpus at once.
 *   2. letter-level fallback — for words not in the lexicon. Gets the
 *      consonant skeleton and long vowels right, guesses short ones. Rough but
 *      readable, and flagged so coverage is measurable rather than assumed.
 *
 * WHY A LEXICON IS VIABLE HERE: the corpus is extremely formulaic — isnad
 * chains and honorifics repeat endlessly. Measured over all 3,824,045 word
 * tokens in 36,187 hadiths:
 *
 *     top    100 word types  ->  64.4% of tokens
 *     top  1,000 word types  ->  88.0%
 *     top  5,000 word types  ->  97.0%
 *     all 37,647 types       ->  100%
 *
 * So a few hundred authored entries carry most of the text, and the tail is
 * where the fallback earns its keep.
 *
 * Output is deliberately marked `textSource: "ur-translit"` by the caller so the
 * UI can disclose machine transliteration rather than passing it off as the
 * hand-checked translations in scripts/data/hadith-hindi/.
 */

/**
 * Multi-word formulae, matched before single-word lookup, longest first.
 *
 * These exist because the honorifics are not compositional. `صلی اللہ علیہ وسلم`
 * is one unit reading "sallallāhu ʿalayhi wa-sallam" — the `اللہ` is already
 * inside "सल्लल्लाहु", so transliterating word by word yields the doubled
 * "सल्लल्लाहु अल्लाह अलैहि वसल्लम". Same for the `رضی اللہ عنہ` family and
 * `رسول اللہ` → "रसूलुल्लाह", where Urdu writes two words and Hindi one.
 *
 * This layer is the highest-leverage part of the file: isnad chains and
 * honorifics are the most repeated sequences in the corpus, so a few dozen
 * entries correct millions of tokens.
 */
const PHRASES: Record<string, string> = {
  "صلی اللہ علیہ وسلم": "सल्लल्लाहु अलैहि वसल्लम",
  "صلی الله علیہ وسلم": "सल्लल्लाहु अलैहि वसल्लम",
  "علیہ الصلاۃ والسلام": "अलैहिस्सलातु वस्सलाम",
  "رضی اللہ عنہما": "रज़ियल्लाहु अन्हुमा",
  "رضی اللہ عنہا": "रज़ियल्लाहु अन्हा",
  "رضی اللہ عنہم": "रज़ियल्लाहु अन्हुम",
  "رضی اللہ عنہ": "रज़ियल्लाहु अन्हु",
  "رضی الله عنہ": "रज़ियल्लाहु अन्हु",
  "علیہم السلام": "अलैहिमुस्सलाम",
  "علیہ السلام": "अलैहिस्सलाम",
  "علیہا السلام": "अलैहस्सलाम",
  "رسول اللہ": "रसूलुल्लाह",
  "رسول الله": "रसूलुल्लाह",
  "عبد اللہ": "अब्दुल्लाह",
  "عبد الرحمٰن": "अब्दुर्रहमान",
  "عبید اللہ": "उबैदुल्लाह",
  "اللہ تعالیٰ": "अल्लाह तआला",
  "الله تعالیٰ": "अल्लाह तआला",
  "ام المؤمنین": "उम्मुल मोमिनीन",
  "انہوں نے": "उन्होंने",
  "انھوں نے": "उन्होंने",
  "ہم سے": "हमसे",
  "ہم کو": "हमको",
  "مجھ سے": "मुझसे",
  "مجھ کو": "मुझको",
  "ابو ہریرہ": "अबू हुरैरा",
  "نبی کریم": "नबी करीम",
  "نبی اکرم": "नबी अकरम",
  "اہل علم": "अहले इल्म",
  "بیان کیا": "बयान किया",
  "بیان کی": "बयान की",
  "روایت کیا": "रिवायत किया",
  "روایت کی": "रिवायत की",
  "روایت کرتے ہیں": "रिवायत करते हैं",
  "نقل کیا": "नक़्ल किया",
  "نقل کرتے ہیں": "नक़्ल करते हैं",
  "کہتے ہیں": "कहते हैं",
  "خبر دی": "ख़बर दी",
  "فرماتے ہیں": "फ़रमाते हैं",
  "فرماتے تھے": "फ़रमाते थे",
  "لا الہٰ الا اللہ": "ला इलाहा इल्लल्लाह",
  "بیت المقدس": "बैतुल मक़्दिस",
  "بیت اللہ": "बैतुल्लाह",
  "ابن عباس": "इब्ने अब्बास",
  "ابن عمر": "इब्ने उमर",
  "ابن مسعود": "इब्ने मसऊद",
  "اللہ کے رسول": "अल्लाह के रसूल",
  "یا رسول اللہ": "या रसूलुल्लाह",

  // Arabic-heh spellings (الله) of the same formulae. Measured: `رضی الله عنہ`
  // alone occurs 8,467 times, and without these it rendered word-by-word as
  // "रज़ी अल्लाह अन्हु" rather than the correct "रज़ियल्लाहु अन्हु".
  "رضی الله عنہما": "रज़ियल्लाहु अन्हुमा",
  "رضی الله عنہا": "रज़ियल्लाहु अन्हा",
  "رضی الله عنہم": "रज़ियल्लाहु अन्हुम",
  "رضی الله عنہن": "रज़ियल्लाहु अन्हुन्न",
  "رضی اللہ عنہن": "रज़ियल्लाहु अन्हुन्न",
  "رضی الله تعالی عنہ": "रज़ियल्लाहु तआला अन्हु",
  "رضی اللہ تعالی عنہ": "रज़ियल्लाहु तआला अन्हु",
  "صلی الله علیه وسلم": "सल्लल्लाहु अलैहि वसल्लम",
  "صلی اللہ علیه وسلم": "सल्लल्लाहु अलैहि वसल्लम",
  "صلی الله علیہ وآلہ وسلم": "सल्लल्लाहु अलैहि व आलिही वसल्लम",
  "رسول الله صلی الله علیہ وسلم": "रसूलुल्लाह सल्लल्लाहु अलैहि वसल्लम",
  "عبد الله": "अब्दुल्लाह",
  "عبید الله": "उबैदुल्लाह",
  "الله تعالی": "अल्लाह तआला",
  "لا الہ الا الله": "ला इलाहा इल्लल्लाह",
  "لا اله الا الله": "ला इलाहा इल्लल्लाह",
  "بیت الله": "बैतुल्लाह",
  "کتاب الله": "किताबुल्लाह",
  "سبحان الله": "सुब्हानल्लाह",
  "سبحان اللہ": "सुब्हानल्लाह",
  "الحمد لله": "अल-हम्दु लिल्लाह",
  "الحمد للہ": "अल-हम्दु लिल्लाह",
  "ان شاء الله": "इन शा अल्लाह",
  "ان شاء اللہ": "इन शा अल्लाह",
  "ما شاء الله": "मा शा अल्लाह",
  "بسم الله": "बिस्मिल्लाह",
  "بسم اللہ": "बिस्मिल्लाह",
  "حدیث بیان کی": "हदीस बयान की",
  "حدیث بیان کیا": "हदीस बयान किया",
  "خبر دی کہ": "ख़बर दी कि",
  "روایت ہے کہ": "रिवायत है कि",
  "روایت ہے": "रिवायत है",
  "سے روایت ہے": "से रिवायत है",
  "نے فرمایا": "ने फ़रमाया",
  "آپ نے فرمایا": "आपने फ़रमाया",
  "اس نے کہا": "उसने कहा",
  "میں نے کہا": "मैंने कहा",
  "میں نے عرض کیا": "मैंने अर्ज़ किया",
  "ہم نے کہا": "हमने कहा",
  "انہوں نے کہا": "उन्होंने कहा",
  "انھوں نے کہا": "उन्होंने कहा",
  "یا رسول الله": "या रसूलुल्लाह",
  "اہل کتاب": "अहले किताब",
  "یوم قیامت": "यौमे क़यामत",
  "قیامت کے دن": "क़यामत के दिन",
  "اللہ کی قسم": "अल्लाह की क़सम",
  "الله کی قسم": "अल्लाह की क़सम",
  "عبد الرحمن": "अब्दुर्रहमान",
  "عبد العزیز": "अब्दुल अज़ीज़",
  "عبد الملک": "अब्दुल मलिक",
  "عبد الوارث": "अब्दुल वारिस",
}

/** Longest phrase first, so `رضی اللہ عنہما` wins over `رضی اللہ عنہ`. */
const PHRASE_KEYS = Object.keys(PHRASES).sort(
  (a, b) => b.split(/\s+/).length - a.split(/\s+/).length || b.length - a.length,
)
const MAX_PHRASE_WORDS = Math.max(...PHRASE_KEYS.map((k) => k.split(/\s+/).length))

/** Urdu word → Devanagari. Ordered by corpus frequency, highest first. */
const LEXICON: Record<string, string> = {
  // --- grammatical core: the top 50 types are ~58% of all tokens ---
  "نے": "ने",
  "اللہ": "अल्लाह",
  "سے": "से",
  "کے": "के",
  "میں": "में",
  "اور": "और",
  "کہ": "कि",
  "کی": "की",
  "ہے": "है",
  "اس": "इस",
  "بن": "बिन",
  "علیہ": "अलैहि",
  "وسلم": "वसल्लम",
  "صلی": "सल्ला",
  "کیا": "किया",
  "رضی": "रज़ी",
  "تو": "तो",
  "کہا": "कहा",
  "کو": "को",
  "آپ": "आप",
  "ہیں": "हैं",
  "ان": "उन",
  "عنہ": "अन्हु",
  "کا": "का",
  "رسول": "रसूल",
  "بیان": "बयान",
  "وہ": "वह",
  "فرمایا": "फ़रमाया",
  "ہم": "हम",
  "کر": "कर",
  "ہو": "हो",
  "ایک": "एक",
  "پر": "पर",
  "کہتے": "कहते",
  "یہ": "यह",
  "انہوں": "उन्होंने",
  "نہیں": "नहीं",
  "پھر": "फिर",
  "نبی": "नबी",
  "روایت": "रिवायत",
  "بھی": "भी",
  "تھے": "थे",
  "نہ": "न",
  "جب": "जब",
  "جو": "जो",
  "حدیث": "हदीस",
  "عبداللہ": "अब्दुल्लाह",
  "اپنے": "अपने",
  "تم": "तुम",
  "تھا": "था",

  // --- next tier ---
  "لیے": "लिए",
  "گا": "गा",
  "اسے": "उसे",
  "الله": "अल्लाह",
  "تعالیٰ": "तआला",
  "نماز": "नमाज़",
  "دیا": "दिया",
  "ابن": "इब्ने",
  "پاس": "पास",
  "یا": "या",
  "کوئی": "कोई",
  "ساتھ": "साथ",
  "عمر": "उमर",
  "جس": "जिस",
  "کریم": "करीम",
  "ہوں": "हूँ",
  "حضرت": "हज़रत",
  "دی": "दी",
  "مجھے": "मुझे",
  "تک": "तक",
  "شخص": "शख़्स",
  "انہیں": "उन्हें",
  "گیا": "गया",
  "عنہما": "अन्हुमा",
  "کرتے": "करते",
  "عنہا": "अन्हा",
  "لوگوں": "लोगों",
  "اسی": "उसी",
  "اکرم": "अकरम",
  "ہوئے": "हुए",
  "دو": "दो",
  "میرے": "मेरे",
  "اپنی": "अपनी",
  "ہی": "ही",
  "جائے": "जाए",
  "طرح": "तरह",
  "کسی": "किसी",
  "سنا": "सुना",
  "اگر": "अगर",
  "لے": "ले",
  "ابی": "अबी",
  "دے": "दे",
  "گے": "गे",
  "انھوں": "उन्होंने",
  "دن": "दिन",
  "امام": "इमाम",
  "رہے": "रहे",
  "ابو": "अबू",
  "ہمیں": "हमें",
  "تھی": "थी",
  "دونوں": "दोनों",
  "محمد": "मुहम्मद",
  "گئے": "गए",
  "لوگ": "लोग",
  "عائشہ": "आइशा",
  "ابوہریرہ": "अबू हुरैरा",
  "مجھ": "मुझ",
  "پوچھا": "पूछा",
  "خبر": "ख़बर",
  "بعد": "बाद",
  "طرف": "तरफ़",
  "کرنے": "करने",
  "کچھ": "कुछ",
  "وقت": "वक़्त",
  "کرے": "करे",
  "ہوا": "हुआ",
  "ام": "उम्म",
  "مالک": "मालिक",
  "سعید": "सईद",
  "و": "व",
  "عباس": "अब्बास",
  "بات": "बात",
  "سب": "सब",
  "انس": "अनस",
  "زیادہ": "ज़्यादा",
  "یہاں": "यहाँ",
  "عرض": "अर्ज़",
  "حکم": "हुक्म",
  "ہاتھ": "हाथ",
  "ترمذی": "तिरमिज़ी",
  "گی": "गी",
  "پہلے": "पहले",
  "حسن": "हसन",
  "دیکھا": "देखा",
  "اے": "ऐ",
  "کرو": "करो",
  "لیکن": "लेकिन",
  "لیا": "लिया",
  "گئی": "गई",
  "والے": "वाले",
  "آئے": "आए",
  "میری": "मेरी",
  "کرتا": "करता",
  "یعنی": "यानी",
  "ہوئی": "हुई",
  "چیز": "चीज़",
  "عمرو": "अम्र",
  "والد": "वालिद",
  "صحیح": "सहीह",
  "عورت": "औरत",
  "سند": "सनद",
  "علی": "अली",
  "پانی": "पानी",
  "تین": "तीन",
  "بارے": "बारे",
  "رہا": "रहा",
  "رات": "रात",
  "ایسا": "ऐसा",
  "گھر": "घर",
  "ہر": "हर",
  "المؤمنین": "अल-मोमिनीन",
  "تمہارے": "तुम्हारे",
  "والا": "वाला",
  "جابر": "जाबिर",
  "اپنا": "अपना",
  "ہمارے": "हमारे",
  "یحییٰ": "यह्या",
  "قسم": "क़सम",
  "تمہیں": "तुम्हें",
  "ہوتا": "होता",
  "آیا": "आया",
  "سفیان": "सुफ़यान",
  "مال": "माल",
  "یہی": "यही",
  "ذکر": "ज़िक्र",
  "سعد": "सअद",
  "پڑھی": "पढ़ी",
  "سر": "सर",
  "جا": "जा",
  "دوسرے": "दूसरे",
  "جاتا": "जाता",
  "شعبہ": "शोबा",
  "کھڑے": "खड़े",
  "عبدالرحمٰن": "अब्दुर्रहमान",
  "السلام": "अस्सलाम",
  "آدمی": "आदमी",
  "فرماتے": "फ़रमाते",
  "پڑھتے": "पढ़ते",
  "ہاں": "हाँ",
  "اہل": "अहल",
  "زید": "ज़ैद",
  "ابوبکر": "अबू बक्र",
  "دعا": "दुआ",
  "کہتی": "कहती",
  "آ": "आ",
  "چنانچہ": "चुनाँचे",
  "ابراہیم": "इब्राहीम",
  "صرف": "सिर्फ़",
  "کیونکہ": "क्योंकि",
  "جائیں": "जाएँ",
  "درمیان": "दरमियान",
  "لو": "लो",
  "وضو": "वुज़ू",
  "جنت": "जन्नत",
  "زمین": "ज़मीन",
  "لگے": "लगे",
  "کریں": "करें",
  "پڑھ": "पढ़",
  "پیچھے": "पीछे",
  "تھیں": "थीं",
  "نازل": "नाज़िल",
  "سلام": "सलाम",
  "سامنے": "सामने",
  "بعض": "बाज़",
  "آیت": "आयत",
  "میرا": "मेरा",
  "بار": "बार",
  "مسعود": "मसऊद",
  "علم": "इल्म",
  "عبد": "अब्द",
  "مسجد": "मस्जिद",
  "جسے": "जिसे",
  "لگا": "लगा",
  "بہت": "बहुत",
  "زہری": "ज़ुहरी",
  "موسیٰ": "मूसा",
  "اب": "अब",
  "حج": "हज",
  "روزہ": "रोज़ा",
  "فرما": "फ़रमा",
  "صحابہ": "सहाबा",
  "نام": "नाम",
  "سلمہ": "सलमा",
  "غلام": "ग़ुलाम",
  "عنہم": "अन्हुम",
  "والوں": "वालों",
  "لا": "ला",
  "جواب": "जवाब",
  "مدینہ": "मदीना",
  "خدمت": "ख़िदमत",
  "واپس": "वापस",
  "تشریف": "तशरीफ़",
  "عروہ": "उरवा",
  "اونٹ": "ऊँट",
  "دیں": "दें",
  "جگہ": "जगह",
  "منع": "मना",
  "سوا": "सिवा",
  "قتل": "क़त्ल",

  // --- grown from the measured miss list; one entry fixes every occurrence ---
  "ابوالیمان": "अबुल यमान",
  "ابوالنعمان": "अबुन नोमान",
  "ابوالزناد": "अबुज़ ज़िनाद",
  "ابوالنضر": "अबुन नज़्र",
  "ابوالحسن": "अबुल हसन",
  "ابوالعمیس": "अबुल उमैस",
  "ابوالتیاح": "अबुत तय्याह",
  "ابوالزبیر": "अबुज़ ज़ुबैर",
  "ابوالولید": "अबुल वलीद",
  "ابوالجعد": "अबुल जअद",
  "ابوالاحوص": "अबुल अहवस",
  "ابوالاسود": "अबुल असवद",
  "ابوالعالیہ": "अबुल आलिया",
  "ابوالخیر": "अबुल ख़ैर",
  "ابوالربیع": "अबुर रबी",
  "ابوالقاسم": "अबुल क़ासिम",
  "ابوالملیح": "अबुल मलीह",
  "ابوالدرداء": "अबुद दरदा",
  "ابوالعباس": "अबुल अब्बास",
  "ابوالطاہر": "अबुत ताहिर",
  "ابوالسائب": "अबुस साइब",
  "ابوالشعثاء": "अबुश शअसा",
  "ابوالمنذر": "अबुल मुंज़िर",
  "ابوالصدیق": "अबुस सद्दीक़",
  "ابوالمتوکل": "अबुल मुतवक्किल",
  "ابوالجوزاء": "अबुल जौज़ा",
  "ابوالحوراء": "अबुल हौरा",
  "ابوالمغیرہ": "अबुल मुग़ीरा",
  "ابوالاشعث": "अबुल अशअस",
  "ابوالخلیل": "अबुल ख़लील",
  "عبدالرزاق": "अब्दुर्रज़्ज़ाक़",
  "عبدالوہاب": "अब्दुल वहाब",
  "عبدالملک": "अब्दुल मलिक",
  "عبدالواحد": "अब्दुल वाहिद",
  "عبدالاعلی": "अब्दुल आला",
  "عبدالصمد": "अब्दुस्समद",
  "عبدالوارث": "अब्दुल वारिस",
  "عبدالرحیم": "अब्दुर्रहीम",
  "عبدالاکرم": "अब्दुल अकरम",
  "اوزاعی": "औज़ाई",
  "زکریا": "ज़करिया",
  "حنظلہ": "हंज़ला",
  "مسروق": "मसरूक़",
  "طلحہ": "तलहा",
  "سمرہ": "समुरा",
  "بریرہ": "बरीरा",
  "صفیہ": "सफ़िया",
  "حفصہ": "हफ़्सा",
  "میمونہ": "मैमूना",
  "خدیجہ": "ख़दीजा",
  "فاطمہ": "फ़ातिमा",
  "اسماء": "अस्मा",
  "زینب": "ज़ैनब",
  "ہشیم": "हुशैम",
  "وکیع": "वकी",
  "یعلی": "यअला",
  "مجاہد": "मुजाहिद",
  "ہلال": "हिलाल",
  "جندب": "जुंदुब",
  "براء": "बरा",
  "حذیفہ": "हुज़ैफ़ा",
  "ابوذر": "अबू ज़र",
  "ابوقتادہ": "अबू क़तादा",
  "ابوایوب": "अबू अय्यूब",
  "ابوامامہ": "अबू उमामा",
  "ابوبرزہ": "अबू बरज़ा",
  "ابوبکرہ": "अबू बकरा",
  "ابوسعید": "अबू सईद",
  "ابوموسی": "अबू मूसा",
  "ابوعبداللہ": "अबू अब्दुल्लाह",
  "ابوالفضل": "अबुल फ़ज़्ल",
  "شریعت": "शरीयत",
  "مسئلہ": "मसअला",
  "تفسیر": "तफ़सीर",
  "صحابی": "सहाबी",
  "تابعی": "ताबई",
  "ضعیف": "ज़ईफ़",
  "مرفوع": "मरफ़ू",
  "موقوف": "मौक़ूफ़",
  "مرسل": "मुर्सल",
  "اختلاف": "इख़्तिलाफ़",
  "جمہور": "जमहूर",
  "مذہب": "मज़हब",
  "فقہاء": "फ़ुक़हा",
  "علماء": "उलमा",
  "مکروہ": "मकरूह",
  "مستحب": "मुस्तहब",
  "واجب": "वाजिब",
  "سنت": "सुन्नत",
  "نفل": "नफ़्ल",
  "فرض": "फ़र्ज़",
  "طہارت": "तहारत",
  "نجاست": "नजासत",
  "تیمم": "तयम्मुम",
  "قبلہ": "क़िबला",
  "اذان": "अज़ान",
  "تکبیر": "तकबीर",
  "قراءت": "क़िराअत",
  "تسبیح": "तसबीह",
  "جمعہ": "जुमा",
  "عید": "ईद",
  "جنازہ": "जनाज़ा",
  "قبر": "क़ब्र",
  "میت": "मय्यित",
  "کفن": "कफ़न",
  "وراثت": "विरासत",
  "طلاق": "तलाक़",
  "مہر": "मेहर",
  "عدت": "इद्दत",
  "رضاعت": "रज़ाअत",
  "تجارت": "तिजारत",
  "سود": "सूद",
  "قاضی": "क़ाज़ी",
  "حد": "हद",
  "قصاص": "क़िसास",
  "دیت": "दियत",
  "چوری": "चोरी",
  "شراب": "शराब",
  "یحیی": "यह्या",
  "عمرے": "उमरे",
  "کہمس": "कहमस",
  "بریدہ": "बुरैदा",
  "بصرہ": "बसरा",
  "تقدیر": "तक़दीर",
  "انکار": "इनकार",
  "سحابہ": "सहाबा",
  "ملاقات": "मुलाक़ात",
  "ارادے": "इरादे",
  "آپس": "आपस",
  "آئی": "आई",
  "آدمی": "आदमी",
  "آئے": "आए",
  "رب": "रब",
  "برابر": "बराबर",
  "مگر": "मगर",
  "والی": "वाली",
  "حق": "हक़",
  "سو": "सौ",
  "وہاں": "वहाँ",
  "کبھی": "कभी",
  "باپ": "बाप",
  "زبیر": "ज़ुबैर",
  "کروں": "करूँ",
  "دینے": "देने",
  "وہی": "वही",
  "کس": "किस",
  "جانتے": "जानते",
  "کیوں": "क्यों",
  "ادا": "अदा",
  "رہی": "रही",
  "جاتی": "जाती",
  "عثمان": "उस्मान",
  "بنا": "बना",
  "راوی": "रावी",
  "مروی": "मरवी",
  "بتایا": "बताया",
  "بیوی": "बीवी",
  "اجازت": "इजाज़त",
  "پوری": "पूरी",
  "سکتا": "सकता",
  "رکعت": "रकअत",
  "صدقہ": "सदक़ा",
  "تمہاری": "तुम्हारी",
  "مبارک": "मुबारक",
  "سن": "सुन",
  "ثابت": "साबित",
  "اوپر": "ऊपर",
  "سال": "साल",
  "یونس": "यूनुस",
  "ملے": "मिले",
  "اعمش": "आमश",
  "رکھ": "रख",
  "من": "मन",
  "دوں": "दूँ",
  "نکلے": "निकले",
  "انصاری": "अंसारी",
  "بلکہ": "बल्कि",
  "جان": "जान",
  "بغیر": "बग़ैर",
  "دل": "दिल",
  "تمام": "तमाम",
  "باقی": "बाक़ी",
  "مانند": "मानिंद",
  "ابوداؤد": "अबू दाऊद",
  "خیال": "ख़याल",
  "حالت": "हालत",
  "بیٹھے": "बैठे",
  "چار": "चार",
  "موجود": "मौजूद",
  "سوال": "सवाल",
  "کھجور": "खजूर",
  "یاد": "याद",
  "پیدا": "पैदा",
  "کہے": "कहे",
  "شریک": "शरीक",
  "کھانے": "खाने",
  "منہ": "मुँह",
  "مرتبہ": "मर्तबा",
  "غسل": "ग़ुस्ल",
  "پسند": "पसंद",
  "جاؤ": "जाओ",
  "شروع": "शुरू",
  "خطاب": "ख़त्ताब",
  "احمد": "अहमद",
  "کم": "कम",
  "البتہ": "अलबत्ता",
  "عورتوں": "औरतों",
  "حال": "हाल",
  "جہنم": "जहन्नम",
  "فر": "फ़र",
  "لیث": "लैस",
  "سفر": "सफ़र",
  "قرآن": "क़ुरआन",
  "سورۃ": "सूरह",
  "سوار": "सवार",
  "کپڑے": "कपड़े",
  "جعفر": "जाफ़र",
  "قبول": "क़बूल",
  "یوسف": "यूसुफ़",
  "علاوہ": "अलावा",
  "اتنا": "इतना",
  "ملا": "मिला",
  "چاہے": "चाहे",
  "اندر": "अंदर",
  "بکر": "बक्र",
  "لیں": "लें",
  "قول": "क़ौल",
  "لیتے": "लेते",
  "نکاح": "निकाह",
  "پڑھنے": "पढ़ने",
  "مراد": "मुराद",
  "قوم": "क़ौम",
  "کئے": "किए",
  "کھا": "खा",
  "ایوب": "अय्यूब",
  "معاویہ": "मुआविया",
  "تاکہ": "ताकि",
  "سوائے": "सिवाए",
  "کہیں": "कहीं",
  "جہاں": "जहाँ",
  "بیٹھ": "बैठ",
  "فرمائی": "फ़रमाई",
  "رکھے": "रखे",
  "پہنچے": "पहुँचे",
  "چلے": "चले",
  "سنائی": "सुनाई",
  "عیینہ": "उयैना",
  "سالم": "सालिम",
  "رکھتے": "रखते",
  "پیش": "पेश",
  "حرام": "हराम",
  "باہر": "बाहर",
  "قیس": "क़ैस",
  "عامر": "आमिर",
  "آخر": "आख़िर",
  "اختیار": "इख़्तियार",
  "سجدہ": "सजदा",
  "پڑھا": "पढ़ा",
  "جریر": "जरीर",
  "حارث": "हारिस",
  "معمر": "मामर",
  "اٹھا": "उठा",
  "ہماری": "हमारी",
  "سورج": "सूरज",
  "نکل": "निकल",
  "اچھی": "अच्छी",
  "رہ": "रह",
  "نزدیک": "नज़दीक",
  "تمہارا": "तुम्हारा",
  "کھڑا": "खड़ा",
  "ذات": "ज़ात",
  "خطبہ": "ख़ुत्बा",
  "عمرہ": "उमरा",
  "فارغ": "फ़ारिग़",
  "نیچے": "नीचे",
  "حماد": "हम्माद",
  "الفاظ": "अल्फ़ाज़",
  "کرتی": "करती",
  "فجر": "फ़ज्र",
  "حاصل": "हासिल",
  "ثوری": "सौरी",
  "ارادہ": "इरादा",
  "پہنچا": "पहुँचा",
  "ماں": "माँ",
  "دور": "दूर",
  "سنی": "सुनी",
  "آنے": "आने",
  "معاذ": "मुआज़",
  "ڈال": "डाल",
  "عطا": "अता",
  "فلاں": "फ़लाँ",
  "سات": "सात",
  "زمانہ": "ज़माना",
  "رکوع": "रुकूअ",
  "آواز": "आवाज़",
  "عقبہ": "उक़बा",
  "راستے": "रास्ते",
  "آزاد": "आज़ाद",
  "دوسرا": "दूसरा",
  "اچھا": "अच्छा",
  "لایا": "लाया",
  "رکعتیں": "रकअतें",
  "چاہتا": "चाहता",
  "کئی": "कई",
  "مسیب": "मुसय्यिब",
  "کعب": "कअब",
  "دین": "दीन",
  "عصر": "अस्र",
  "ابھی": "अभी",
  "امت": "उम्मत",
  "مر": "मर",
  "نظر": "नज़र",
  "خون": "ख़ून",
  "عطاء": "अता",
  "موت": "मौत",
  "مقام": "मक़ाम",
  "اضافہ": "इज़ाफ़ा",
  "شام": "शाम",
  "جنگ": "जंग",
  "بچے": "बच्चे",
  "بیٹے": "बेटे",
  "سکے": "सके",
  "ابوسلمہ": "अबू सलमा",
  "گوشت": "गोश्त",
  "دس": "दस",
  "پس": "पस",
  "اشارہ": "इशारा",
  "اتنے": "इतने",
  "جانتا": "जानता",
  "پناہ": "पनाह",
  "صالح": "सालेह",
  "بجائے": "बजाय",
  "لئے": "लिए",
  "تیرے": "तेरे",
  "انصار": "अंसार",
  "کتاب": "किताब",
  "جمع": "जमा",
  "جی": "जी",
  "قبیلہ": "क़बीला",
  "تیری": "तेरी",
  "یوں": "यूँ",
  "پڑھائی": "पढ़ाई",
  "مرد": "मर्द",
  "حمید": "हुमैद",
  "مار": "मार",
  "احرام": "एहराम",
  "اللهم": "अल्लाहुम्मा",
  "مل": "मिल",
  "کہو": "कहो",
  "بھر": "भर",
  "سہل": "सहल",
  "بال": "बाल",
  "جبیر": "जुबैर",
  "إلا": "इल्ला",
  "شیطان": "शैतान",
  "دار": "दार",
  "جانور": "जानवर",
  "عبدالعزیز": "अब्दुल अज़ीज़",
  "ہشام": "हिशाम",
  "باب": "बाब",
  "غریب": "ग़रीब",
  "ایسی": "ऐसी",
  "اسماعیل": "इस्माईल",
  "ایسے": "ऐसे",
  "جن": "जिन",
  "ہونے": "होने",
  "ہوتی": "होती",
  "شہاب": "शिहाब",
  "قیامت": "क़यामत",
  "نافع": "नाफ़े",
  "کرنا": "करना",
  "متعلق": "मुतअल्लिक़",
  "حاضر": "हाज़िर",
  "وجہ": "वजह",
  "کہہ": "कह",
  "داخل": "दाख़िल",
  "سلیمان": "सुलैमान",
  "یزید": "यज़ीद",
  "بنت": "बिन्त",
  "دیتے": "देते",
  "عمل": "अमल",
  "دیتا": "देता",
  "دوسری": "दूसरी",
  "چھوڑ": "छोड़",
  "معلوم": "मालूम",
  "لائے": "लाए",
  "جیسے": "जैसे",
  "خود": "ख़ुद",
  "حصہ": "हिस्सा",
  "جانے": "जाने",
  "آئی": "आई",
  "جاتے": "जाते",
  "ہوتے": "होते",
  "کہنے": "कहने",
  "کون": "कौन",
  "ما": "मा",
  "قریب": "क़रीब",
  "لی": "ली",
  "صبح": "सुबह",
  "بہتر": "बेहतर",
  "بھیجا": "भेजा",
  "کام": "काम",
  "اسحاق": "इसहाक़",
  "آگے": "आगे",
  "خالد": "ख़ालिद",
  "احادیث": "अहादीस",
  "رکھا": "रखा",
  "دیکھ": "देख",
  "خدری": "ख़ुदरी",
  "مکہ": "मक्का",
  "مسلم": "मुस्लिम",
  "مسدد": "मुसद्दद",
  "قتادہ": "क़तादा",
  "خادم": "ख़ादिम",
  "حسین": "हुसैन",
  "نقل": "नक़्ल",
  "ایماندار": "ईमानदार",
  "بھائی": "भाई",
  "نفس": "नफ़्स",
  "عبیداللہ": "उबैदुल्लाह",
  "عکرمہ": "इकरिमा",
  "بنیاد": "बुनियाद",
  "پانچ": "पाँच",
  "قائم": "क़ायम",
  "اول": "अव्वल",
  "گواہی": "गवाही",
  "دینا": "देना",
  "معبود": "माबूद",
  "بیشک": "बेशक",
  "اسلام": "इस्लाम",
  "زکواہ": "ज़कात",
  "زکوۂ": "ज़कात",
  "رمضان": "रमज़ान",
  "روزے": "रोज़े",
  "ایمان": "ईमान",
  "ساڀ": "साठ",
  "شاخیں": "शाख़ें",
  "حیاء": "हया",
  "شرم": "शर्म",
  "مہاجر": "मुहाजिर",
  "زبان": "ज़बान",
  "افضل": "अफ़ज़ल",
  "سلامتی": "सलामती",
  "کھانا": "खाना",
  "منافق": "मुनाफ़िक़",
  "جھوٹ": "झूठ",
  "وعدہ": "वादा",
  "امین": "अमीन",
  "خیانت": "ख़यानत",
  "جہاد": "जिहाद",
  "راہ": "राह",
  "مسلمان": "मुसलमान",
  "مسلمانوں": "मुसलमानों",
  "ثواب": "सवाब",
  "نیت": "नीयत",
  "ہجرت": "हिजरत",
  "دنیا": "दुनिया",
  "شادی": "शादी",
  "گواہ": "गवाह",
  "ضامن": "ज़ामिन",
  "قرض": "क़र्ज़",
  "دینار": "दीनार",
  "بنی": "बनी",
  "اسرائیل": "इसराईल",
  "فرشتہ": "फ़रिश्ता",
  "جبرائیل": "जिब्राईल",
  "آسمان": "आसमान",
  "دوزخ": "दोज़ख़",
  "عذاب": "अज़ाब",
  "مغفرت": "मग़फ़िरत",
  "توبہ": "तौबा",
  "گناہ": "गुनाह",
  "نیکی": "नेकी",
  "مسلہ": "मसअला",
}

/**
 * Aspirated and retroflex digraphs, matched before single letters.
 *
 * `ھ` (do-chashmi he) marks aspiration in Urdu and never stands alone, so these
 * pairs are single Devanagari letters rather than a consonant plus ह.
 */
const DIGRAPHS: Record<string, string> = {
  "بھ": "भ",
  "پھ": "फ",
  "تھ": "थ",
  "ٹھ": "ठ",
  "جھ": "झ",
  "چھ": "छ",
  "دھ": "ध",
  "ڈھ": "ढ",
  "کھ": "ख",
  "گھ": "घ",
  "ڑھ": "ढ़",
  "رھ": "र्ह",
  "لھ": "ल्ह",
  "مھ": "म्ह",
  "نھ": "न्ह",
  "آ": "आ",
}

/** Single consonants. Several Urdu letters collapse onto one Devanagari form —
 *  ث ص س all write स, ذ ز ض ظ all write ज़ — which is correct, not lossy: Hindi
 *  does not preserve the Arabic distinctions either. */
const CONSONANTS: Record<string, string> = {
  "ب": "ब",
  "پ": "प",
  "ت": "त",
  "ٹ": "ट",
  "ث": "स",
  "ج": "ज",
  "چ": "च",
  "ح": "ह",
  "خ": "ख़",
  "د": "द",
  "ڈ": "ड",
  "ذ": "ज़",
  "ر": "र",
  "ڑ": "ड़",
  "ز": "ज़",
  "ژ": "ज़",
  "س": "स",
  "ش": "श",
  "ص": "स",
  "ض": "ज़",
  "ط": "त",
  "ظ": "ज़",
  "غ": "ग़",
  "ف": "फ़",
  "ق": "क़",
  "ک": "क",
  " گ": "ग",
  "گ": "ग",
  "ل": "ल",
  "م": "म",
  "ن": "न",
  "ہ": "ह",
  "ھ": "ह",
  "ء": "",
  "ع": "",
  "أ": "अ",
  "إ": "इ",
  "ۂ": "ह",

  // Arabic-form variants of letters Urdu normally writes differently. The
  // corpus mixes both — ه (U+0647) alongside ہ (U+06C1), ك alongside ک — and
  // omitting these left Arabic script in 23.6% of transliterated entries.
  "ه": "ह",
  "ك": "क",
  "ة": "ा",
  "ۃ": "ा",
  "ى": "ा",
  "ً": "न",
  "ٱ": "अ",
  "ئ": "",
  "ؤ": "व",
}

/** Vowel signs, when the source bothers to write them. */
const DIACRITICS: Record<string, string> = {
  "َ": "",
  "ِ": "ि",
  "ُ": "ु",
  "ٰ": "ा",
  "ً": "न",
  "ٌ": "ुन",
  "ٍ": "िन",
  "ْ": "्",
}

/** Urdu punctuation and digits that differ from Latin. */
const LIGATURES: Record<string, string> = {
  "ﷺ": "सल्लल्लाहु अलैहि वसल्लम",
  "ﷻ": "अज़्ज़ व जल्ल",
  "ﷲ": "अल्लाह",
}

const PUNCTUATION: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "؎": "", "؟": "?",
  "۔": "।",
  "،": ",",
  "؛": ";",
  "ـ": "",
  "ٓ": "",
  "ٔ": "",
  "ٕ": "",
  "ٗ": "ू",
  "ٖ": "",
  "﴾": ")",
  "﴿": "(",
  "ؓ": " रज़ियल्लाहु अन्हु",
  "ؒ": " रहिमहुल्लाह",
  "ؑ": " अलैहिस्सलाम",
  "ؐ": " अलैहिस्सलाम",
}

const isConsonantOutput = (s: string) => /[क-ह]$/.test(s.replace(/[़]$/, ""))

/**
 * Letter-level transliteration for a word the lexicon does not know.
 *
 * Deliberately conservative about short vowels: Urdu does not write them, so
 * guessing produces confident-looking errors. The consonant skeleton and long
 * vowels come out right, which keeps the word recognisable to a reader even
 * when the vocalisation is off.
 */
function fallbackWord(word: string): string {
  let out = ""
  let i = 0

  // `ابوال…` and `عبدال…` are "Abu al-X" / "Abd al-X" written solid — 1,492 and
  // ~900 occurrences respectively. Letter-by-letter they come out as
  // "अबोलयमान"; split, the tail transliterates cleanly and reads as a name.
  if (word.startsWith("ابوال") && word.length > 5) {
    return "अबुल " + fallbackWord(word.slice(5))
  }
  if (word.startsWith("عبدال") && word.length > 5) {
    return "अब्دुल " + fallbackWord(word.slice(5))
  }
  if (word.startsWith("ابو") && word.length > 3) {
    return "अबू " + fallbackWord(word.slice(3))
  }

  while (i < word.length) {
    const two = word.slice(i, i + 2)
    if (DIGRAPHS[two] !== undefined) {
      const mapped = DIGRAPHS[two]
      // آ mid-word is the long ā matra, not the standalone vowel.
      out += two === "آ" && out ? "ा" : mapped
      i += 2
      continue
    }

    const ch = word[i]
    const atStart = out === ""
    const atEnd = i === word.length - 1

    // Word-final `ہ` after a consonant is he-e-mukhtafi — the silent h that
    // Hindi writes as ā: قتادہ -> क़तादा, شعبہ -> शोबा, not क़तादह.
    if (ch === "ہ" && atEnd && !atStart && isConsonantOutput(out)) {
      out += "ा"
      i++
      continue
    }

    if (ch === "آ") {
      // Single-codepoint alef-madda: the standalone long ā.
      out += atStart || !isConsonantOutput(out) ? "आ" : "ा"
      i++
      continue
    }

    if (LIGATURES[ch] !== undefined) {
      out += LIGATURES[ch]
      i++
      continue
    }

    if (ch === "ا") {
      // Word-initial alif carries a vowel; elsewhere it is long ā.
      out += atStart ? "अ" : isConsonantOutput(out) ? "ा" : ""
      i++
      continue
    }

    if (ch === "و") {
      // و is v, o or ū depending on position — the single biggest ambiguity.
      // After a consonant it is far more often a vowel than a glide here.
      out += atStart ? "व" : isConsonantOutput(out) ? "ो" : "व"
      i++
      continue
    }

    if (ch === "ی" || ch === "ي") {
      out += atStart ? "य" : isConsonantOutput(out) ? "ी" : "य"
      i++
      continue
    }

    if (ch === "ے") {
      out += isConsonantOutput(out) ? "े" : "ए"
      i++
      continue
    }

    if (ch === "ں") {
      out += "ं"
      i++
      continue
    }

    if (ch === "ّ") {
      // Shadda doubles the preceding consonant: ब + ् + ब.
      const last = out.match(/[क-ह]़?$/)?.[0]
      if (last) out += "्" + last
      i++
      continue
    }

    if (DIACRITICS[ch] !== undefined) {
      out += DIACRITICS[ch]
      i++
      continue
    }

    if (CONSONANTS[ch] !== undefined) {
      out += CONSONANTS[ch]
      i++
      continue
    }

    if (PUNCTUATION[ch] !== undefined) {
      out += PUNCTUATION[ch]
      i++
      continue
    }

    // Anything else (Latin, digits, quotes) passes through untouched.
    out += ch
    i++
  }

  return out
}

export interface TransliterationResult {
  text: string
  /** Word tokens resolved from the lexicon. */
  known: number
  /** Word tokens that fell back to letter rules. */
  unknown: number
  /** Distinct unknown tokens, for growing the lexicon where it pays most. */
  misses: string[]
}

/**
 * Zero-width joiners and the Arabic tatweel appear scattered through the source
 * — `‌` prefixes 3,326 tokens of `اللہ`/`عنہ`/`رضی` alone — and would
 * otherwise defeat every exact lookup.
 */
const URDU_LETTER = /[ء-غف-يٹ-ڿہ-ۓ]/

const ZERO_WIDTH = /[​-‏‪-‮⁦-⁩﻿ـ]/g

/**
 * A combining mark repeated three or more times, which no orthography produces.
 * Muslim 1501 carries 82 consecutive `ٗ` (U+0657) in its `ur` field; mapping
 * each one faithfully gave 82 consecutive `ू` in the Devanagari, so the one
 * visibly broken string in the whole transliterated corpus was a corpus defect
 * passed through rather than a rule getting it wrong. Collapsed to a single
 * mark, which is what the writer can only have meant.
 *
 * Deliberately narrow: runs of *punctuation* are left alone, because `.....` in
 * Muslim 209 is the source's own ellipsis and editing it would be a judgement
 * call about someone else's prose rather than a repair.
 */
const REPEATED_MARK = /([ً-ٰٟۖ-ۭ])\1{2,}/g

/**
 * A combining mark with no base letter in front of it. Unicode leaves this
 * degenerate and fonts draw a dotted circle around it, so the only sound
 * reading is debris — the Muslim 1501 run sits after a space with nothing to
 * attach to. Dropped rather than mapped, so it cannot become an orphan matra.
 */
const ORPHAN_MARK = /(^|\s)[ً-ٰٟۖ-ۭ]+/g

/** Is this token Urdu script at all? Latin, digits and punctuation are not. */
// Includes the Arabic Presentation Forms blocks, where the ﷺ ligature lives —
// omitting them let that token bypass transliteration entirely.
const HAS_ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/

/**
 * 25 hadith entries hold fully-vocalised classical ARABIC in the `urdu` field,
 * not Urdu — `وحدثنا أبو كريب بن محمد` and the like. A corpus defect, and every
 * consumer of that field has to route around it: transliterating them produces
 * confident gibberish ("वहद्दसना अबुव कुरी्बिन"), and translating them would be
 * an Arabic job labelled as an Urdu one. Shared here so scripts/translit-hadith.ts
 * and scripts/ai-hindi-pass.ts cannot disagree about which entries those are.
 *
 * Detected structurally: Urdu has letters Arabic simply does not use (گ چ پ
 * ٹ ڈ ڑ ے ں ھ ہ ی). Text with none of those but carrying Arabic-only
 * forms, or text heavily marked with harakat, is Arabic.
 */
const URDU_ONLY = /[گچپٹڎڑےںھہۃی]/
const ARABIC_ONLY = /[ةكهيأإؤئ]/
const HARAKAT = /[ً-ْ]/g

export function isArabicNotUrdu(text: string): boolean {
  const harakatRatio = (text.match(HARAKAT) ?? []).length / text.length
  return (!URDU_ONLY.test(text) && ARABIC_ONLY.test(text)) || harakatRatio > 0.08
}

/**
 * Transliterate an Urdu passage into Devanagari.
 *
 * Splits on whitespace while keeping the separators, so the result preserves the
 * original line structure exactly. Leading and trailing punctuation is peeled
 * off each token before the lexicon lookup and re-attached after, so `اللہ!`
 * resolves the same as `اللہ`.
 */
export function transliterateUrdu(text: string): TransliterationResult {
  if (!text) return { text: "", known: 0, unknown: 0, misses: [] }

  let known = 0
  let unknown = 0
  const misses = new Set<string>()
  const mapPunct = (s: string) => [...s].map((c) => PUNCTUATION[c] ?? c).join("")

  // Split keeping separators, so the original spacing and line breaks survive.
  const parts = text
    .replace(ZERO_WIDTH, "")
    .replace(REPEATED_MARK, "$1")
    .replace(ORPHAN_MARK, "$1")
    .split(/(\s+)/)
  const out: string[] = []

  for (let i = 0; i < parts.length; i++) {
    const token = parts[i]
    if (!token.trim()) {
      out.push(token)
      continue
    }

    // Phrase pass. Look ahead over word tokens (skipping the whitespace parts)
    // and try the longest formula first, so `رضی اللہ عنہما` is not eaten by
    // `رضی اللہ عنہ`. Punctuation after the final word is preserved.
    let matched = false
    for (let span = MAX_PHRASE_WORDS; span >= 2 && !matched; span--) {
      const words: string[] = []
      let j = i
      while (words.length < span && j < parts.length) {
        if (parts[j].trim()) words.push(parts[j])
        j++
      }
      if (words.length < span) continue

      // Compare ignoring trailing punctuation on the last word only.
      const lastTrail = words[span - 1].match(/[!?:;,.،۔«»)"'‘’“”]+$/)?.[0] ?? ""
      const candidate = words
        .map((w, n) => (n === span - 1 ? w.slice(0, w.length - lastTrail.length) : w))
        .join(" ")

      const hit = PHRASES[candidate]
      if (hit === undefined) continue
      out.push(hit + mapPunct(lastTrail))
      known += span
      i = j - 1
      matched = true
    }
    if (matched) continue

    if (!HAS_ARABIC.test(token)) {
      // Latin and digits pass through; Urdu punctuation still converts.
      out.push(mapPunct(token))
      continue
    }

    const lead = token.match(/^[«»("'‘’“”–—-]+/)?.[0] ?? ""
    const trail = token.match(/[«»)("'‘’“”!?:;,.،۔؟؎–—-]+$/)?.[0] ?? ""
    const core = token.slice(lead.length, token.length - trail.length)

    if (!core) {
      out.push(mapPunct(token))
      continue
    }

    const hit = LEXICON[core]
    if (hit !== undefined) {
      known++
      out.push(mapPunct(lead) + hit + mapPunct(trail))
      continue
    }

    unknown++
    // Only real words belong on the lexicon worklist. Digits and footnote
    // markers reach here too, but the fallback already renders them correctly,
    // so counting them would bury the words that actually need an entry.
    if (URDU_LETTER.test(core)) misses.add(core)
    out.push(mapPunct(lead) + fallbackWord(core) + mapPunct(trail))
  }

  return { text: out.join(""), known, unknown, misses: [...misses] }
}

/** Entries in the lexicon — reported by the apply script so growth is visible. */
export const LEXICON_SIZE = Object.keys(LEXICON).length
