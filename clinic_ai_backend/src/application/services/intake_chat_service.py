"""Intake chat orchestration service module."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from difflib import SequenceMatcher

from src.adapters.db.mongo.client import get_database
from src.adapters.external.ai.openai_client import IntakeTurnError, OpenAIQuestionClient
from src.adapters.external.whatsapp.meta_whatsapp_client import MetaWhatsAppClient
from src.application.use_cases.generate_pre_visit_summary import GeneratePreVisitSummaryUseCase
from src.core.config import get_settings
from src.core.language_support import normalize_intake_language
from src.core.language_support import uses_hindi_template_family


STOP_WORDS = {
    "stop",
    "enough",
    "exit",
    "quit",
    "cancel",
    "end",
    "band",
    "band karo",
    "rok do",
    "ruk jao",
    "bas",
    "रुको",
    "रुकिए",
    "रुकना",
    "बंद",
    "बंद करो",
    "बस",
    "ఆపు",
    "ఆపండి",
    "చాలు",
    "நிறுத்து",
    "நிறுத்துங்கள்",
    "போதும்",
    "বন্ধ",
    "থামুন",
    "থামো",
    "पुरे",
    "थांब",
    "थांबा",
    "थांबवा",
    "ನಿಲ್ಲಿಸಿ",
    "ನಿಲ್ಲಿಸು",
    "ಸಾಕು",
}
MIN_FOLLOW_UP_QUESTIONS = 3
logger = logging.getLogger(__name__)

INTAKE_STATIC_TEXT = {
    "opening": {
        "en": "Hello! Please reply with any message to begin your intake.",
        "hi": "नमस्ते! अपना इनटेक शुरू करने के लिए कोई भी संदेश भेजें।",
        "hi-eng": "Namaste! Apna intake shuru karne ke liye koi bhi message bhejiye.",
        "ta": "வணக்கம்! உங்கள் இன்டேக் தொடங்க ஏதேனும் ஒரு செய்தியை அனுப்புங்கள்.",
        "te": "నమస్తే! మీ ఇంటేక్ ప్రారంభించడానికి ఏదైనా సందేశం పంపండి.",
        "bn": "নমস্কার! আপনার ইনটেক শুরু করতে যেকোনো একটি মেসেজ পাঠান।",
        "mr": "नमस्कार! तुमचा इंटेक सुरू करण्यासाठी कोणताही संदेश पाठवा.",
        "kn": "ನಮಸ್ಕಾರ! ನಿಮ್ಮ ಇಂಟೇಕ್ ಪ್ರಾರಂಭಿಸಲು ಯಾವುದೇ ಸಂದೇಶವನ್ನು ಕಳುಹಿಸಿ.",
    },
    "chief_complaint": {
        "en": "Please describe your main health problem in a few words.",
        "hi": "कृपया अपनी मुख्य स्वास्थ्य समस्या कुछ शब्दों में बताइए।",
        "hi-eng": "Kripya apni mukhya swasthya samasya kuch shabdon mein batayen.",
        "ta": "தயவுசெய்து உங்கள் முக்கிய உடல்நல பிரச்சினையை சில வார்த்தைகளில் சொல்லுங்கள்.",
        "te": "దయచేసి మీ ప్రధాన ఆరోగ్య సమస్యను కొన్ని మాటల్లో చెప్పండి.",
        "bn": "দয়া করে আপনার প্রধান স্বাস্থ্য সমস্যাটি কয়েকটি কথায় বলুন।",
        "mr": "कृपया तुमची मुख्य आरोग्य समस्या काही शब्दांत सांगा.",
        "kn": "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಮುಖ್ಯ ಆರೋಗ್ಯ ಸಮಸ್ಯೆಯನ್ನು ಕೆಲವು ಪದಗಳಲ್ಲಿ ತಿಳಿಸಿ.",
    },
    "stop_confirmation": {
        "en": "Thank you. We will continue with your submitted answers.",
        "hi": "धन्यवाद। हम आपके दिए गए जवाबों के साथ आगे बढ़ेंगे।",
        "hi-eng": "Dhanyavaad. Hum aapke diye gaye jawaabon ke saath aage badhenge.",
    },
    "final_question": {
        "en": "Please describe anything else about your symptoms, health, or concerns that you feel is important and has not been shared yet?",
        "hi": "कृपया बताइए कि क्या आपकी तकलीफ, स्वास्थ्य, या चिंता के बारे में कोई और महत्वपूर्ण बात है जो अभी तक साझा नहीं हुई है?",
        "hi-eng": "Kripya batayen ki kya aapki takleef, health, ya concern ke baare mein koi aur zaroori baat hai jo abhi tak share nahi hui hai?",
        "ta": "உங்கள் அறிகுறிகள், உடல்நலம் அல்லது கவலைகள் பற்றி இன்னும் பகிரப்படாத ஏதேனும் முக்கியமான விஷயம் இருந்தால் தயவுசெய்து சொல்லுங்கள்.",
        "te": "మీ లక్షణాలు, ఆరోగ్యం లేదా ఆందోళనల గురించి ఇంకా చెప్పని ఏదైనా ముఖ్యమైన విషయం ఉంటే దయచేసి చెప్పండి.",
        "bn": "আপনার উপসর্গ, স্বাস্থ্য বা উদ্বেগ সম্পর্কে এখনো বলা হয়নি এমন কোনো গুরুত্বপূর্ণ বিষয় থাকলে দয়া করে জানান।",
        "mr": "तुमच्या लक्षणांबद्दल, आरोग्याबद्दल किंवा चिंतेबद्दल अजून काही महत्त्वाची माहिती सांगायची राहिली असेल तर कृपया सांगा.",
        "kn": "ನಿಮ್ಮ ಲಕ್ಷಣಗಳು, ಆರೋಗ್ಯ ಅಥವಾ ಚಿಂತೆಯ ಬಗ್ಗೆ ಇನ್ನೂ ಹಂಚಲಾಗದ ಯಾವುದೇ ಪ್ರಮುಖ ವಿಷಯ ಇದ್ದರೆ ದಯವಿಟ್ಟು ತಿಳಿಸಿ.",
    },
    "closing_named": {
        "en": "Thank you {patient_name}, we have everything we need. Your doctor will be fully prepared for your visit. Please arrive on time. See you soon.",
        "hi": "धन्यवाद {patient_name}, हमें सारी ज़रूरी जानकारी मिल गई है। आपके डॉक्टर पूरी तरह तैयार रहेंगे। कृपया समय पर पहुँचें। जल्द मिलेंगे।",
        "hi-eng": "Dhanyavaad {patient_name}, humein saari zaroori jaankari mil gayi hai. Aapke doctor aapki visit ke liye poori tarah taiyar rahenge. Kripya samay par pahunchiye. Jaldi milte hain.",
        "ta": "நன்றி {patient_name}, எங்களுக்கு தேவையான அனைத்து தகவலும் கிடைத்துவிட்டது. உங்கள் வருகைக்காக மருத்துவர் முழுமையாக தயாராக இருப்பார். தயவுசெய்து நேரத்திற்கு வாருங்கள். விரைவில் சந்திப்போம்.",
        "te": "ధన్యవాదాలు {patient_name}, మాకు అవసరమైన సమాచారం అందింది. మీ వైద్యుడు మీ సందర్శనకు పూర్తిగా సిద్ధంగా ఉంటారు. దయచేసి సమయానికి రండి. త్వరలో కలుద్దాం.",
        "bn": "ধন্যবাদ {patient_name}, আমাদের প্রয়োজনীয় সব তথ্য পাওয়া গেছে। আপনার ডাক্তার আপনার ভিজিটের জন্য পুরোপুরি প্রস্তুত থাকবেন। অনুগ্রহ করে সময়মতো আসবেন। শীঘ্রই দেখা হবে।",
        "mr": "धन्यवाद {patient_name}, आम्हाला आवश्यक सर्व माहिती मिळाली आहे. तुमचे डॉक्टर तुमच्या भेटीसाठी पूर्णपणे तयार असतील. कृपया वेळेवर या. लवकरच भेटू.",
        "kn": "ಧನ್ಯವಾದಗಳು {patient_name}, ನಮಗೆ ಅಗತ್ಯವಾದ ಎಲ್ಲಾ ಮಾಹಿತಿ ದೊರಕಿದೆ. ನಿಮ್ಮ ವೈದ್ಯರು ನಿಮ್ಮ ಭೇಟಿಗೆ ಸಂಪೂರ್ಣವಾಗಿ ಸಿದ್ಧರಾಗಿರುತ್ತಾರೆ. ದಯವಿಟ್ಟು ಸಮಯಕ್ಕೆ ಬನ್ನಿ. ಶೀಘ್ರದಲ್ಲೇ ಭೇಟಿಯಾಗೋಣ.",
    },
    "closing_unnamed": {
        "en": "Thank you, we have everything we need. Your doctor will be fully prepared for your visit. Please arrive on time. See you soon.",
        "hi": "धन्यवाद, हमें सारी ज़रूरी जानकारी मिल गई है। आपके डॉक्टर पूरी तरह तैयार रहेंगे। कृपया समय पर पहुँचें। जल्द मिलेंगे।",
        "hi-eng": "Dhanyavaad, humein saari zaroori jaankari mil gayi hai. Aapke doctor aapki visit ke liye poori tarah taiyar rahenge. Kripya samay par pahunchiye. Jaldi milte hain.",
        "ta": "நன்றி, எங்களுக்கு தேவையான அனைத்து தகவலும் கிடைத்துவிட்டது. உங்கள் வருகைக்காக மருத்துவர் முழுமையாக தயாராக இருப்பார். தயவுசெய்து நேரத்திற்கு வாருங்கள். விரைவில் சந்திப்போம்.",
        "te": "ధన్యవాదాలు, మాకు అవసరమైన సమాచారం అందింది. మీ వైద్యుడు మీ సందర్శనకు పూర్తిగా సిద్ధంగా ఉంటారు. దయచేసి సమయానికి రండి. త్వరలో కలుద్దాం.",
        "bn": "ধন্যবাদ, আমাদের প্রয়োজনীয় সব তথ্য পাওয়া গেছে। আপনার ডাক্তার আপনার ভিজিটের জন্য পুরোপুরি প্রস্তুত থাকবেন। অনুগ্রহ করে সময়মতো আসবেন। শীঘ্রই দেখা হবে।",
        "mr": "धन्यवाद, आम्हाला आवश्यक सर्व माहिती मिळाली आहे. तुमचे डॉक्टर तुमच्या भेटीसाठी पूर्णपणे तयार असतील. कृपया वेळेवर या. लवकरच भेटू.",
        "kn": "ಧನ್ಯವಾದಗಳು, ನಮಗೆ ಅಗತ್ಯವಾದ ಎಲ್ಲಾ ಮಾಹಿತಿ ದೊರಕಿದೆ. ನಿಮ್ಮ ವೈದ್ಯರು ನಿಮ್ಮ ಭೇಟಿಗೆ ಸಂಪೂರ್ಣವಾಗಿ ಸಿದ್ಧರಾಗಿರುತ್ತಾರೆ. ದಯವಿಟ್ಟು ಸಮಯಕ್ಕೆ ಬನ್ನಿ. ಶೀಘ್ರದಲ್ಲೇ ಭೇಟಿಯಾಗೋಣ.",
    },
}

INTAKE_FALLBACK_QUESTIONS = {
    "en": [
        "Since when are you facing this issue?",
        "Where exactly is the discomfort or pain?",
        "Are symptoms constant or on and off?",
        "Are you currently taking any medicines?",
        "Any fever, vomiting, or breathing difficulty?",
    ],
    "hi": [
        "यह समस्या कब से है?",
        "दर्द या तकलीफ़ कहाँ है?",
        "लक्षण लगातार हैं या बीच-बीच में आते हैं?",
        "क्या आप अभी कोई दवा ले रहे हैं?",
        "क्या बुखार, उल्टी, या सांस लेने में दिक्कत है?",
    ],
    "hi-eng": [
        "Yeh samasya kab se hai?",
        "Dard ya takleef kahan hai?",
        "Lakshan lagataar hain ya beech-beech mein aate hain?",
        "Kya aap abhi koi dawa le rahe hain?",
        "Kya bukhar, ulti, ya saans lene mein dikkat hai?",
    ],
    "ta": [
        "இந்த பிரச்சினை உங்களுக்கு எப்போதிலிருந்து உள்ளது?",
        "வலி அல்லது அசௌகரியம் எங்கு உள்ளது?",
        "அறிகுறிகள் தொடர்ந்து இருக்கிறதா அல்லது இடையிடையே வருகிறதா?",
        "நீங்கள் இப்போது ஏதேனும் மருந்துகள் எடுத்துக்கொள்கிறீர்களா?",
        "காய்ச்சல், வாந்தி, அல்லது சுவாசிக்க சிரமம் உள்ளதா?",
    ],
    "te": [
        "ఈ సమస్య మీకు ఎప్పటి నుంచి ఉంది?",
        "నొప్పి లేదా అసౌకర్యం ఎక్కడ ఉంది?",
        "లక్షణాలు నిరంతరంగా ఉన్నాయా లేదా మధ్య మధ్యలో వస్తున్నాయా?",
        "మీరు ఇప్పుడు ఏమైనా మందులు తీసుకుంటున్నారా?",
        "జ్వరం, వాంతులు, లేదా శ్వాస తీసుకోవడంలో ఇబ్బంది ఉందా?",
    ],
    "bn": [
        "এই সমস্যা কবে থেকে হচ্ছে?",
        "ব্যথা বা অস্বস্তি কোথায় হচ্ছে?",
        "উপসর্গগুলো সব সময় থাকে, নাকি মাঝে মাঝে হয়?",
        "আপনি কি এখন কোনো ওষুধ খাচ্ছেন?",
        "জ্বর, বমি, বা শ্বাসকষ্ট আছে কি?",
    ],
    "mr": [
        "ही समस्या तुम्हाला कधीपासून आहे?",
        "दुखणे किंवा त्रास नेमका कुठे आहे?",
        "लक्षणे सतत आहेत का मधूनमधून येतात?",
        "तुम्ही सध्या काही औषधे घेत आहात का?",
        "ताप, उलटी, किंवा श्वास घेण्यास त्रास आहे का?",
    ],
    "kn": [
        "ಈ ಸಮಸ್ಯೆ ನಿಮಗೆ ಯಾವಾಗದಿಂದ ಇದೆ?",
        "ನೋವು ಅಥವಾ ಅಸೌಕರ್ಯ ಎಲ್ಲಿದೆ?",
        "ಲಕ್ಷಣಗಳು ನಿರಂತರವಾಗಿವೆಯೇ ಅಥವಾ ಮಧ್ಯೆ ಮಧ್ಯೆ ಬರುತ್ತವೆಯೇ?",
        "ನೀವು ಈಗ ಯಾವುದಾದರೂ ಔಷಧಿಗಳನ್ನು ತೆಗೆದುಕೊಳ್ಳುತ್ತಿದ್ದೀರಾ?",
        "ಜ್ವರ, ವಾಂತಿ, ಅಥವಾ ಉಸಿರಾಟದ ತೊಂದರೆ ಇದೆಯೆ?",
    ],
}

INTAKE_RECOVERY_QUESTIONS = {
    "en": {
        "onset_duration": "When did this problem first start, and has it been constant or on and off since then?",
        "severity_progression": "How has this problem been changing over time - better, worse, or about the same?",
        "associated_symptoms": "What other symptoms have you noticed along with this? Please describe them a little.",
        "red_flag_check": "Have you had any serious warning symptoms such as severe pain, breathing trouble, fainting, or bleeding?",
        "current_medications": "What medicines, supplements, or home remedies are you taking right now for this?",
        "impact_daily_life": "How is this affecting your daily routine - like sleep, eating, work, or movement?",
        "treatment_history": "What treatment have you already received for this? Please share a bit more detail.",
        "recurrence_status": "Is this a recurrence of an older problem, or a follow-up for an existing diagnosis?",
    },
    "hi": {
        "onset_duration": "यह समस्या कब शुरू हुई थी, और क्या यह लगातार रहती है या बीच-बीच में होती है?",
        "severity_progression": "समय के साथ यह समस्या कैसी बदल रही है - बेहतर, बदतर, या लगभग वैसी ही?",
        "associated_symptoms": "इस समस्या के साथ और कौन से लक्षण हो रहे हैं? कृपया थोड़ा विस्तार से बताइए।",
        "red_flag_check": "क्या कोई गंभीर लक्षण हुए हैं, जैसे तेज दर्द, सांस की दिक्कत, बेहोशी, या खून आना?",
        "current_medications": "अभी आप कौन-कौन सी दवाएं, सप्लीमेंट, या घरेलू इलाज ले रहे हैं?",
        "impact_daily_life": "यह समस्या आपकी रोज़मर्रा की ज़िंदगी पर कैसे असर डाल रही है - जैसे नींद, खाना, काम या चलना-फिरना?",
        "treatment_history": "अब तक आपने इसके लिए क्या इलाज कराया है? कृपया थोड़ा विस्तार से बताइए।",
        "recurrence_status": "क्या यह पुरानी समस्या दोबारा हुई है, या पहले से चली आ रही बीमारी का फॉलो-अप है?",
    },
    "hi-eng": {
        "onset_duration": "Yeh samasya kab shuru hui thi, aur kya yeh lagataar rehti hai ya beech-beech mein hoti hai?",
        "severity_progression": "Samay ke saath yeh samasya kaise badal rahi hai - behtar, badtar, ya lagbhag waise hi?",
        "associated_symptoms": "Is samasya ke saath aur kaun se lakshan ho rahe hain? Kripya thoda vistaar se batayen.",
        "red_flag_check": "Kya koi gambhir lakshan hue hain, jaise tez dard, saans ki dikkat, behoshi, ya khoon aana?",
        "current_medications": "Abhi aap kaun-kaun si dawa, supplement, ya gharelu ilaaj le rahe hain?",
        "impact_daily_life": "Yeh samasya aapki rozmarra ki zindagi par kaise asar daal rahi hai - jaise neend, khana, kaam ya chalna-phirna?",
        "treatment_history": "Ab tak aapne iske liye kya ilaaj karaya hai? Kripya thoda vistaar se batayen.",
        "recurrence_status": "Kya yeh purani samasya dobara hui hai, ya pehle se chal rahi bimari ka follow-up hai?",
    },
    "ta": {
        "onset_duration": "இந்த பிரச்சினை முதலில் எப்போது தொடங்கியது, அதன் பிறகு இது தொடர்ந்து இருக்கிறதா அல்லது இடையிடையே வருகிறதா?",
        "severity_progression": "காலப்போக்கில் இந்த பிரச்சினை எப்படி மாறியுள்ளது - மேம்பட்டதா, மோசமாயிற்றா, அல்லது கிட்டத்தட்ட அதேபோல உள்ளதா?",
        "associated_symptoms": "இந்த பிரச்சினையுடன் சேர்த்து நீங்கள் வேறு என்ன அறிகுறிகளை கவனித்துள்ளீர்கள்? தயவுசெய்து கொஞ்சம் விரிவாக சொல்லுங்கள்.",
        "red_flag_check": "கடுமையான வலி, சுவாசிக்க சிரமம், மயக்கம், இரத்தப்போக்கு போன்ற எந்த தீவிர எச்சரிக்கை அறிகுறிகளும் உள்ளனவா?",
        "current_medications": "இந்த பிரச்சினைக்காக நீங்கள் தற்போது எந்த மருந்துகள், சப்பிள்மென்ட்கள், அல்லது வீட்டு வைத்தியங்களை பயன்படுத்துகிறீர்கள்?",
        "impact_daily_life": "இந்த பிரச்சினை உங்கள் நாளாந்த வாழ்க்கையை எப்படி பாதிக்கிறது - உதாரணமாக தூக்கம், உணவு, வேலை, அல்லது நடமாட்டத்தில்?",
        "treatment_history": "இதுவரை இந்த பிரச்சினைக்காக நீங்கள் என்ன சிகிச்சை பெற்றுள்ளீர்கள்? தயவுசெய்து கொஞ்சம் விரிவாக சொல்லுங்கள்.",
        "recurrence_status": "இது புதிய பிரச்சினையா, பழைய பிரச்சினை மீண்டும் வந்ததா, அல்லது ஏற்கனவே இருந்த நோய்க்கான பின்தொடர்பா?",
    },
    "te": {
        "onset_duration": "ఈ సమస్య మొదట ఎప్పుడు ప్రారంభమైంది, అప్పటి నుంచి నిరంతరంగా ఉందా లేదా మధ్య మధ్యలో వస్తోందా?",
        "severity_progression": "కాలక్రమంలో ఈ సమస్య ఎలా మారుతోంది - మెరుగవుతోందా, అధ్వాన్నమవుతోందా, లేక దాదాపు అలాగే ఉందా?",
        "associated_symptoms": "ఈ సమస్యతో పాటు మీకు మరే ఇతర లక్షణాలు కనిపించాయి? దయచేసి కొంచెం వివరంగా చెప్పండి.",
        "red_flag_check": "తీవ్రమైన నొప్పి, శ్వాస తీసుకోవడంలో ఇబ్బంది, మూర్ఛ, రక్తస్రావం వంటి ఏవైనా తీవ్రమైన హెచ్చరిక లక్షణాలు ఉన్నాయా?",
        "current_medications": "ఈ సమస్య కోసం మీరు ప్రస్తుతం ఏ మందులు, సప్లిమెంట్లు లేదా ఇంటి చిట్కాలు ఉపయోగిస్తున్నారు?",
        "impact_daily_life": "ఈ సమస్య మీ రోజువారీ జీవితం మీద ఎలా ప్రభావం చూపుతోంది - నిద్ర, తినడం, పని లేదా కదలికలపై?",
        "treatment_history": "ఇప్పటివరకు ఈ సమస్యకు మీరు ఏ చికిత్స తీసుకున్నారు? దయచేసి కొంచెం వివరంగా చెప్పండి.",
        "recurrence_status": "ఇది కొత్త సమస్యా, పాత సమస్య మళ్లీ వచ్చిందా, లేదా ఇప్పటికే ఉన్న నిర్ధారణకు ఫాలో-అప్‌నా?",
    },
    "bn": {
        "onset_duration": "এই সমস্যা প্রথম কবে শুরু হয়েছিল, আর তারপর থেকে কি সব সময় ছিল নাকি মাঝে মাঝে হয়েছে?",
        "severity_progression": "সময়ের সাথে এই সমস্যাটি কীভাবে বদলাচ্ছে - ভালো হচ্ছে, খারাপ হচ্ছে, নাকি প্রায় একই আছে?",
        "associated_symptoms": "এই সমস্যার সাথে আর কী কী উপসর্গ আপনি লক্ষ্য করেছেন? দয়া করে একটু বিস্তারিত বলুন।",
        "red_flag_check": "তীব্র ব্যথা, শ্বাসকষ্ট, অজ্ঞান হয়ে যাওয়া, রক্তপাতের মতো কোনো গুরুতর সতর্ক সংকেত কি হয়েছে?",
        "current_medications": "এই সমস্যার জন্য আপনি এখন কী কী ওষুধ, সাপ্লিমেন্ট, বা ঘরোয়া চিকিৎসা নিচ্ছেন?",
        "impact_daily_life": "এই সমস্যা আপনার দৈনন্দিন জীবনে কীভাবে প্রভাব ফেলছে - যেমন ঘুম, খাওয়া, কাজ, বা চলাফেরায়?",
        "treatment_history": "এখন পর্যন্ত এই সমস্যার জন্য আপনি কী চিকিৎসা নিয়েছেন? দয়া করে একটু বিস্তারিত বলুন।",
        "recurrence_status": "এটি কি নতুন সমস্যা, আগের সমস্যার পুনরাবৃত্তি, নাকি পুরনো রোগের ফলো-আপ?",
    },
    "mr": {
        "onset_duration": "ही समस्या प्रथम कधी सुरू झाली, आणि तेव्हापासून सतत आहे का अधूनमधून होते?",
        "severity_progression": "कालांतराने ही समस्या कशी बदलत आहे - सुधारते आहे, वाढते आहे, की जवळजवळ तशीच आहे?",
        "associated_symptoms": "या समस्येसोबत अजून कोणती लक्षणे जाणवली आहेत? कृपया थोडे सविस्तर सांगा.",
        "red_flag_check": "तीव्र वेदना, श्वास घेण्यास त्रास, बेशुद्ध पडणे, किंवा रक्तस्राव यांसारखी कोणती गंभीर लक्षणे झाली आहेत का?",
        "current_medications": "या समस्येसाठी तुम्ही सध्या कोणती औषधे, सप्लिमेंट्स, किंवा घरगुती उपाय घेत आहात?",
        "impact_daily_life": "ही समस्या तुमच्या रोजच्या आयुष्यावर कसा परिणाम करत आहे - जसे झोप, खाणे, काम, किंवा हालचाल?",
        "treatment_history": "आत्तापर्यंत या समस्येसाठी तुम्ही कोणता उपचार घेतला आहे? कृपया थोडे सविस्तर सांगा.",
        "recurrence_status": "ही नवीन समस्या आहे, जुन्या समस्येची पुनरावृत्ती आहे, की आधीच्या निदानाचा फॉलो-अप आहे?",
    },
    "kn": {
        "onset_duration": "ಈ ಸಮಸ್ಯೆ ಮೊದಲು ಯಾವಾಗ ಆರಂಭವಾಯಿತು, ಮತ್ತು ಆಗಿನಿಂದ ಇದು ನಿರಂತರವಾಗಿದೆಯೇ ಅಥವಾ ಮಧ್ಯೆ ಮಧ್ಯೆ ಆಗುತ್ತಿದೆಯೇ?",
        "severity_progression": "ಕಾಲಕ್ರಮದಲ್ಲಿ ಈ ಸಮಸ್ಯೆ ಹೇಗೆ ಬದಲಾಗುತ್ತಿದೆ - ಉತ್ತಮವಾಗುತ್ತಿದೆಯೇ, ಕೆಡುತ್ತಿದೆನೋ, ಅಥವಾ ಬಹುತೇಕ ಅದೇ ರೀತಿಯಲ್ಲಿದೆಯೇ?",
        "associated_symptoms": "ಈ ಸಮಸ್ಯೆಯ ಜೊತೆಗೆ ಇನ್ನೇನು ಲಕ್ಷಣಗಳನ್ನು ನೀವು ಗಮನಿಸಿದ್ದೀರಿ? ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ವಿವರವಾಗಿ ತಿಳಿಸಿ.",
        "red_flag_check": "ತೀವ್ರ ನೋವು, ಉಸಿರಾಟದ ತೊಂದರೆ, ಮೂರ್ಛೆ, ರಕ್ತಸ್ರಾವ ಇತ್ಯಾದಿ ಗಂಭೀರ ಎಚ್ಚರಿಕೆ ಲಕ್ಷಣಗಳೇನಾದರೂ ಇವೆಯೇ?",
        "current_medications": "ಈ ಸಮಸ್ಯೆಗೆ ನೀವು ಈಗ ಯಾವ ಔಷಧಿ, ಪೂರಕ, ಅಥವಾ ಮನೆಮದ್ದುಗಳನ್ನು ತೆಗೆದುಕೊಳ್ಳುತ್ತಿದ್ದೀರಿ?",
        "impact_daily_life": "ಈ ಸಮಸ್ಯೆ ನಿಮ್ಮ ದಿನನಿತ್ಯದ ಜೀವನದ ಮೇಲೆ ಹೇಗೆ ಪರಿಣಾಮ ಬೀರುತ್ತಿದೆ - ಉದಾಹರಣೆಗೆ ನಿದ್ರೆ, ಊಟ, ಕೆಲಸ, ಅಥವಾ ಚಲನವಲನ?",
        "treatment_history": "ಇಲ್ಲಿಯವರೆಗೆ ಈ ಸಮಸ್ಯೆಗೆ ನೀವು ಯಾವ ಚಿಕಿತ್ಸೆ ಪಡೆದಿದ್ದೀರಿ? ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ವಿವರವಾಗಿ ತಿಳಿಸಿ.",
        "recurrence_status": "ಇದು ಹೊಸ ಸಮಸ್ಯೆಯೇ, ಹಳೆಯ ಸಮಸ್ಯೆಯ ಮರುಕಳಿಕೆಯೇ, ಅಥವಾ ಈಗಾಗಲೇ ಇರುವ ನಿರ್ಧಾರಿತ ಸಮಸ್ಯೆಯ ಫಾಲೋ-ಅಪ್‌ವೇ?",
    },
}


class IntakeChatService:
    """Coordinates intake question flow on WhatsApp."""

    def __init__(self) -> None:
        self.db = get_database()
        self.whatsapp = MetaWhatsAppClient()
        self.openai = OpenAIQuestionClient()

    def start_intake(self, patient_id: str, visit_id: str, to_number: str, language: str) -> None:
        """Start intake with opening message; first clinical question comes after user reply."""
        normalized_to_number = self._normalize_phone_number(to_number)
        opening_message = self._opening_message(language)

        self.db.intake_sessions.update_one(
            {"visit_id": visit_id},
            {
                "$set": {
                    "patient_id": patient_id,
                    "visit_id": visit_id,
                    "to_number": normalized_to_number,
                    "language": language,
                    "status": "awaiting_conversation_start",
                    "greeting_sent": True,
                    "illness": None,
                    "answers": [],
                    "pending_question": None,
                    "pending_topic": None,
                    "question_number": 1,
                    "max_questions": 10,
                    "processed_message_ids": [],
                    "recent_inbound_text": None,
                    "recent_inbound_at": None,
                    "last_outbound_at": None,
                    "updated_at": datetime.now(timezone.utc),
                },
                "$setOnInsert": {"created_at": datetime.now(timezone.utc)},
            },
            upsert=True,
        )
        settings = get_settings()
        if settings.whatsapp_intake_template_name:
            language_code = (
                settings.whatsapp_intake_template_lang_hi
                if uses_hindi_template_family(language)
                else settings.whatsapp_intake_template_lang_en
            )
            body_values = [opening_message] if settings.whatsapp_intake_template_param_count > 0 else []
            # Send first business-initiated template to open the WhatsApp conversation window.
            self._safe_send_template(
                to_number=normalized_to_number,
                template_name=settings.whatsapp_intake_template_name,
                language_code=language_code,
                body_values=body_values,
            )
        else:
            self._safe_send_text(normalized_to_number, opening_message)

    def handle_patient_reply(self, from_number: str, message_text: str, message_id: str | None = None) -> None:
        """Handle incoming WhatsApp reply and continue intake."""
        normalized_from = self._normalize_phone_number(from_number)
        session = self.db.intake_sessions.find_one(
            {
                "to_number": normalized_from,
                "status": {"$in": ["awaiting_conversation_start", "awaiting_illness", "in_progress"]},
            },
            sort=[("updated_at", -1)],
        )
        if not session and normalized_from:
            # Backward compatibility for older records saved with + prefix.
            session = self.db.intake_sessions.find_one(
                {
                    "to_number": f"+{normalized_from}",
                    "status": {"$in": ["awaiting_conversation_start", "awaiting_illness", "in_progress"]},
                },
                sort=[("updated_at", -1)],
            )
        if not session:
            return

        if message_id and not self._claim_message(session["_id"], message_id):
            return

        cleaned = (message_text or "").strip()
        if not cleaned:
            return
        if self._is_probable_duplicate_reply(session, cleaned):
            return
        self._remember_inbound_text(session["_id"], cleaned)
        stop_detection = self._detect_stop_request(
            message_text=cleaned,
            language=str(session.get("language", "en") or "en"),
            answers=list(session.get("answers", [])),
        )
        if bool(stop_detection.get("detected", False)):
            logger.info(
                "intake_stop_detected visit_id=%s session_id=%s source=%s confidence=%s reason=%s",
                str(session.get("visit_id", "") or ""),
                str(session.get("_id", "") or ""),
                str(stop_detection.get("source", "") or ""),
                str(stop_detection.get("confidence", "") or ""),
                str(stop_detection.get("reason", "") or ""),
            )
            self.db.intake_sessions.update_one(
                {"_id": session["_id"]},
                {"$set": {"status": "stopped", "updated_at": datetime.now(timezone.utc)}},
            )
            end_msg = self._closing_message(
                session.get("language", "en"),
                session.get("patient_name"),
            )
            self._safe_send_text(from_number, end_msg)
            self._auto_generate_pre_visit_summary(session)
            return

        status = session.get("status")
        if status == "awaiting_conversation_start":
            self.db.intake_sessions.update_one(
                {"_id": session["_id"], "status": "awaiting_conversation_start"},
                {
                    "$set": {
                        "status": "awaiting_illness",
                        "updated_at": datetime.now(timezone.utc),
                    }
                },
            )
            self._safe_send_text(
                session["to_number"],
                self._chief_complaint_question(session.get("language", "en")),
            )
            return

        if status == "awaiting_illness":
            self._save_illness_and_generate_questions(session, cleaned)
            return

        if status == "in_progress":
            if self._should_treat_as_illness_correction(session, cleaned):
                self._replace_illness_and_regenerate(session, cleaned)
                return
            self._save_answer_and_ask_next(session, cleaned)

    def handle_web_reply(
        self,
        patient_id: str,
        visit_id: str,
        message_text: str,
        message_id: str | None = None,
    ) -> None:
        """Handle browser reply by routing through the same intake session."""
        session = self.db.intake_sessions.find_one(
            {
                "patient_id": patient_id,
                "visit_id": visit_id,
            },
            sort=[("updated_at", -1)],
        )
        if not session:
            raise ValueError("Intake session not found for this patient and visit")
        to_number = str(session.get("to_number") or "").strip()
        if not to_number:
            raise ValueError("No phone number found for this intake session")
        self.handle_patient_reply(
            from_number=to_number,
            message_text=message_text,
            message_id=message_id,
        )

    def get_session_state(self, patient_id: str, visit_id: str) -> dict:
        """Return normalized state used by patient chat APIs."""
        session = self.db.intake_sessions.find_one(
            {"patient_id": patient_id, "visit_id": visit_id},
            sort=[("updated_at", -1)],
        )
        if not session:
            raise ValueError("Intake session not found for this patient and visit")
        return self._session_state_payload(session)

    def get_latest_session_by_phone(self, phone_number: str) -> dict:
        """Fetch latest intake session for a phone number."""
        normalized = self._normalize_phone_number(phone_number)
        if not normalized:
            raise ValueError("Invalid phone number")
        session = self.db.intake_sessions.find_one(
            {"to_number": {"$in": [normalized, f"+{normalized}"]}},
            sort=[("updated_at", -1)],
        )
        if not session:
            raise ValueError("No intake session found for this phone number")
        return self._session_state_payload(session)

    def _session_state_payload(self, session: dict) -> dict:
        """Map DB session record to API response shape."""
        status = str(session.get("status") or "awaiting_conversation_start")
        language = str(session.get("language") or "en")
        last_outbound_text = str(session.get("pending_question") or "").strip()
        if not last_outbound_text:
            if status == "awaiting_conversation_start":
                last_outbound_text = self._opening_message(language)
            elif status == "awaiting_illness":
                last_outbound_text = self._chief_complaint_question(language)
            elif status == "completed":
                last_outbound_text = self._closing_message(language, session.get("patient_name"))
            elif status == "stopped":
                last_outbound_text = self._closing_message(language, session.get("patient_name"))
            else:
                last_outbound_text = self._chief_complaint_question(language)

        return {
            "patient_id": str(session.get("patient_id") or ""),
            "visit_id": str(session.get("visit_id") or ""),
            "status": status,
            "question_number": int(session.get("question_number", 1) or 1),
            "last_outbound_text": last_outbound_text,
            "last_outbound_at": session.get("last_outbound_at"),
        }

    def _save_illness_and_generate_questions(self, session: dict, illness_text: str) -> None:
        claimed = self.db.intake_sessions.find_one_and_update(
            {"_id": session["_id"], "status": "awaiting_illness"},
            {
                "$set": {
                    "illness": illness_text,
                    "status": "in_progress",
                    "updated_at": datetime.now(timezone.utc),
                },
                "$push": {"answers": {"question": "illness", "answer": illness_text}},
            },
        )
        if not claimed:
            return
        refreshed = self.db.intake_sessions.find_one({"_id": session["_id"]}) or claimed
        self._generate_and_send_next_turn(refreshed)

    def _save_answer_and_ask_next(self, session: dict, answer_text: str) -> None:
        current_question = str(session.get("pending_question", "") or "").strip()
        if not current_question:
            return
        claimed = self.db.intake_sessions.find_one_and_update(
            {
                "_id": session["_id"],
                "status": "in_progress",
                "pending_question": current_question,
            },
            {
                "$push": {
                    "answers": {
                        "question": current_question,
                        "topic": session.get("pending_topic"),
                        "answer": answer_text,
                    }
                },
                "$set": {
                    "pending_question": None,
                    "pending_topic": None,
                    "status": "in_progress",
                    "updated_at": datetime.now(timezone.utc),
                },
            },
        )
        if not claimed:
            return
        refreshed = self.db.intake_sessions.find_one({"_id": session["_id"]}) or claimed
        self._generate_and_send_next_turn(refreshed)

    def _replace_illness_and_regenerate(self, session: dict, illness_text: str) -> None:
        answers = list(session.get("answers", []))
        replaced = False
        for answer in answers:
            if answer.get("question") == "illness":
                answer["answer"] = illness_text
                replaced = True
                break
        if not replaced:
            answers.insert(0, {"question": "illness", "answer": illness_text})

        self.db.intake_sessions.update_one(
            {"_id": session["_id"]},
            {
                "$set": {
                    "illness": illness_text,
                    "answers": answers,
                    "pending_question": None,
                    "pending_topic": None,
                    "question_number": 1,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
        refreshed = self.db.intake_sessions.find_one({"_id": session["_id"]}) or session
        self._generate_and_send_next_turn(refreshed)

    def _generate_and_send_next_turn(self, session: dict) -> None:
        language = session.get("language", "en")
        fallback_topic = self._planner_fallback_topic(session)
        planner_fallback_question = self.openai._topic_message(fallback_topic, language)
        try:
            if self._should_ask_final_question(session):
                final_qn = int(session.get("question_number", 1) or 1)
                self._store_and_send_question(
                    session=session,
                    message=self._final_question(language),
                    topic="final_check",
                    question_number=final_qn,
                    message_source="template_fallback",
                    fallback_reason="",
                    selected_topic="final_check",
                    model_topic="",
                )
                self._log_intake_turn(
                    session=session,
                    question_number=final_qn,
                    selected_topic="final_check",
                    model_topic="",
                    message_source="template_fallback",
                    llm_structure_valid=False,
                    llm_message_valid=False,
                    fallback_reason="",
                    is_complete=False,
                )
                return
            if self._has_reached_intake_limit(session):
                closing_qn = int(session.get("question_number", 1) or 1)
                closing_message = self._closing_message(language, session.get("patient_name"))
                self._complete_session(
                    session,
                    closing_message,
                    "closing",
                    closing_qn,
                    message_source="template_fallback",
                    fallback_reason="",
                    selected_topic="closing",
                    model_topic="",
                )
                self._log_intake_turn(
                    session=session,
                    question_number=closing_qn,
                    selected_topic="closing",
                    model_topic="",
                    message_source="template_fallback",
                    llm_structure_valid=False,
                    llm_message_valid=False,
                    fallback_reason="",
                    is_complete=True,
                )
                return
            patient = self.db.patients.find_one({"patient_id": session.get("patient_id")}) or {}
            context = {
                "patient_name": patient.get("name", ""),
                "patient_age": patient.get("age", ""),
                "gender": patient.get("gender", ""),
                "language": language,
                "question_number": int(session.get("question_number", 1) or 1),
                "max_questions": int(session.get("max_questions", 8) or 8),
                "previous_qa_json": session.get("answers", []),
                "has_travelled_recently": bool(patient.get("travelled_recently", False)),
                "chief_complaint": session.get("illness", ""),
            }
            ai_turn = self.openai.generate_intake_turn(context)
            message = str(ai_turn.get("message", "") or "").strip()
            if not message:
                raise RuntimeError("Empty message in AI turn")
            is_complete = bool(ai_turn.get("is_complete", False))
            topic = str(ai_turn.get("topic", "") or "")
            question_number = int(ai_turn.get("question_number", session.get("question_number", 1)) or 1)
            if topic == "closing":
                is_complete = True

            if self._is_repeated_turn(session, message, topic):
                recovery = self._build_recovery_turn(language, topic, session, ai_turn)
                if recovery:
                    self._store_and_send_question(
                        session=session,
                        message=recovery["message"],
                        topic=recovery["topic"],
                        question_number=question_number,
                        message_source="template_fallback",
                        fallback_reason="",
                        selected_topic=recovery["topic"],
                        model_topic=str(ai_turn.get("last_model_topic", "") or ""),
                    )
                    self._log_intake_turn(
                        session=session,
                        question_number=question_number,
                        selected_topic=str(recovery["topic"] or ""),
                        model_topic=str(ai_turn.get("last_model_topic", "") or ""),
                        message_source="template_fallback",
                        llm_structure_valid=bool(ai_turn.get("llm_structure_valid", False)),
                        llm_message_valid=bool(ai_turn.get("llm_message_valid", False)),
                        fallback_reason="",
                        is_complete=False,
                    )
                    return
                self._store_and_send_question(
                    session=session,
                    message=planner_fallback_question,
                    topic="clarification",
                    question_number=question_number,
                    message_source="template_fallback",
                    fallback_reason="topic_mismatch",
                    selected_topic=fallback_topic,
                    model_topic=str(ai_turn.get("last_model_topic", "") or ""),
                )
                self._log_intake_turn(
                    session=session,
                    question_number=question_number,
                    selected_topic=fallback_topic,
                    model_topic=str(ai_turn.get("last_model_topic", "") or ""),
                    message_source="template_fallback",
                    llm_structure_valid=bool(ai_turn.get("llm_structure_valid", False)),
                    llm_message_valid=bool(ai_turn.get("llm_message_valid", False)),
                    fallback_reason="topic_mismatch",
                    is_complete=False,
                )
                return

            if is_complete and self._can_complete_intake(session, ai_turn):
                self._log_intake_turn(
                    session=session,
                    question_number=question_number,
                    selected_topic=str(ai_turn.get("last_selected_topic", topic) or topic),
                    model_topic=str(ai_turn.get("last_model_topic", "") or ""),
                    message_source=str(ai_turn.get("last_message_source", "template_fallback") or "template_fallback"),
                    llm_structure_valid=bool(ai_turn.get("llm_structure_valid", False)),
                    llm_message_valid=bool(ai_turn.get("llm_message_valid", False)),
                    fallback_reason=str(ai_turn.get("last_fallback_reason", "") or ""),
                    is_complete=True,
                )
                self._complete_session(
                    session,
                    message,
                    topic,
                    question_number,
                    message_source=str(ai_turn.get("last_message_source", "template_fallback") or "template_fallback"),
                    fallback_reason=str(ai_turn.get("last_fallback_reason", "") or ""),
                    selected_topic=str(ai_turn.get("last_selected_topic", topic) or topic),
                    model_topic=str(ai_turn.get("last_model_topic", "") or ""),
                )
                return

            if is_complete:
                recovery = self._build_recovery_turn(language, topic, session, ai_turn)
                if recovery:
                    self._store_and_send_question(
                        session=session,
                        message=recovery["message"],
                        topic=recovery["topic"],
                        question_number=question_number,
                        message_source="template_fallback",
                        fallback_reason="",
                        selected_topic=recovery["topic"],
                        model_topic=str(ai_turn.get("last_model_topic", "") or ""),
                    )
                    self._log_intake_turn(
                        session=session,
                        question_number=question_number,
                        selected_topic=str(recovery["topic"] or ""),
                        model_topic=str(ai_turn.get("last_model_topic", "") or ""),
                        message_source="template_fallback",
                        llm_structure_valid=bool(ai_turn.get("llm_structure_valid", False)),
                        llm_message_valid=bool(ai_turn.get("llm_message_valid", False)),
                        fallback_reason="",
                        is_complete=False,
                    )
                    return

            self._store_and_send_question(
                session=session,
                message=message,
                topic=topic,
                question_number=question_number,
                message_source=str(ai_turn.get("last_message_source", "template_fallback") or "template_fallback"),
                fallback_reason=str(ai_turn.get("last_fallback_reason", "") or ""),
                selected_topic=str(ai_turn.get("last_selected_topic", topic) or topic),
                model_topic=str(ai_turn.get("last_model_topic", "") or ""),
            )
            self._log_intake_turn(
                session=session,
                question_number=question_number,
                selected_topic=str(ai_turn.get("last_selected_topic", topic) or topic),
                model_topic=str(ai_turn.get("last_model_topic", "") or ""),
                message_source=str(ai_turn.get("last_message_source", "template_fallback") or "template_fallback"),
                llm_structure_valid=bool(ai_turn.get("llm_structure_valid", False)),
                llm_message_valid=bool(ai_turn.get("llm_message_valid", False)),
                fallback_reason=str(ai_turn.get("last_fallback_reason", "") or ""),
                is_complete=bool(is_complete),
            )
            return
        except IntakeTurnError as exc:
            fallback_reason = exc.reason_code
            model_topic = exc.model_topic
        except Exception:
            fallback_reason = "unknown_exception"
            model_topic = ""

        # Safe fallback if model call/parsing fails.
        self.db.intake_sessions.update_one(
            {"_id": session["_id"]},
            {
                "$set": {
                    "status": "in_progress",
                    "pending_question": planner_fallback_question,
                    "pending_topic": fallback_topic,
                    "last_outbound_at": datetime.now(timezone.utc).isoformat(),
                    "last_message_source": "global_fallback",
                    "last_fallback_reason": fallback_reason,
                    "last_selected_topic": fallback_topic,
                    "last_model_topic": model_topic,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
        self._safe_send_text(session["to_number"], planner_fallback_question)
        self._log_intake_turn(
            session=session,
            question_number=int(session.get("question_number", 1) or 1),
            selected_topic=fallback_topic,
            model_topic=model_topic,
            message_source="global_fallback",
            llm_structure_valid=False,
            llm_message_valid=False,
            fallback_reason=fallback_reason,
            is_complete=False,
        )

    def _store_and_send_question(
        self,
        session: dict,
        message: str,
        topic: str,
        question_number: int,
        *,
        message_source: str,
        fallback_reason: str,
        selected_topic: str,
        model_topic: str,
    ) -> None:
        now = datetime.now(timezone.utc)
        self.db.intake_sessions.update_one(
            {"_id": session["_id"]},
            {
                "$set": {
                    "status": "in_progress",
                    "pending_question": message,
                    "pending_topic": topic,
                    "question_number": max(question_number + 1, int(session.get("question_number", 1) or 1) + 1),
                    "last_outbound_at": now.isoformat(),
                    "last_message_source": message_source,
                    "last_fallback_reason": fallback_reason,
                    "last_selected_topic": selected_topic,
                    "last_model_topic": model_topic,
                    "updated_at": now,
                }
            },
        )
        self._safe_send_text(session["to_number"], message)

    def _complete_session(
        self,
        session: dict,
        message: str,
        topic: str,
        question_number: int,
        *,
        message_source: str,
        fallback_reason: str,
        selected_topic: str,
        model_topic: str,
    ) -> None:
        now = datetime.now(timezone.utc)
        self.db.intake_sessions.update_one(
            {"_id": session["_id"]},
            {
                "$set": {
                    "status": "completed",
                    "pending_question": None,
                    "pending_topic": topic,
                    "question_number": question_number,
                    "last_outbound_at": now.isoformat(),
                    "last_message_source": message_source,
                    "last_fallback_reason": fallback_reason,
                    "last_selected_topic": selected_topic,
                    "last_model_topic": model_topic,
                    "updated_at": now,
                }
            },
        )
        self._safe_send_text(session["to_number"], message)
        self._auto_generate_pre_visit_summary(session)

    def _safe_send_text(self, to_number: str, message: str) -> None:
        """Best-effort WhatsApp send; never break intake flow on transport errors."""
        try:
            self.whatsapp.send_text(to_number, message)
        except Exception as exc:
            logger.warning("whatsapp_send_text_failed to=%s error=%s", to_number, str(exc))

    def _safe_send_template(
        self,
        *,
        to_number: str,
        template_name: str,
        language_code: str,
        body_values: list[str],
    ) -> None:
        """Best-effort WhatsApp template send; keep core flow functional if auth is invalid."""
        try:
            self.whatsapp.send_template(
                to_number=to_number,
                template_name=template_name,
                language_code=language_code,
                body_values=body_values,
            )
        except Exception as exc:
            logger.warning(
                "whatsapp_send_template_failed to=%s template=%s error=%s",
                to_number,
                template_name,
                str(exc),
            )

    def _planner_fallback_topic(self, session: dict) -> str:
        context = {
            "chief_complaint": session.get("illness", ""),
            "gender": session.get("gender", ""),
            "patient_age": session.get("patient_age"),
            "previous_qa_json": session.get("answers", []),
            "has_travelled_recently": bool(session.get("has_travelled_recently", False)),
        }
        guidance = self.openai._build_condition_guidance(context)
        next_topic = self.openai._next_topic_from_plan(context=context, guidance=guidance)
        return next_topic if next_topic != "closing" else "associated_symptoms"

    @staticmethod
    def _log_intake_turn(
        *,
        session: dict,
        question_number: int,
        selected_topic: str,
        model_topic: str,
        message_source: str,
        llm_structure_valid: bool,
        llm_message_valid: bool,
        fallback_reason: str,
        is_complete: bool,
    ) -> None:
        logger.info(
            "intake_turn visit_id=%s session_id=%s question_number=%s selected_topic=%s model_topic=%s "
            "message_source=%s llm_structure_valid=%s llm_message_valid=%s fallback_reason=%s is_complete=%s",
            str(session.get("visit_id", "") or ""),
            str(session.get("_id", "") or ""),
            int(question_number),
            str(selected_topic or ""),
            str(model_topic or ""),
            str(message_source or ""),
            bool(llm_structure_valid),
            bool(llm_message_valid),
            str(fallback_reason or ""),
            bool(is_complete),
        )

    def _claim_message(self, session_id: object, message_id: str) -> bool:
        result = self.db.intake_sessions.update_one(
            {"_id": session_id, "processed_message_ids": {"$ne": message_id}},
            {"$push": {"processed_message_ids": message_id}},
        )
        return result.modified_count == 1

    def _should_treat_as_illness_correction(self, session: dict, message_text: str) -> bool:
        illness = str(session.get("illness", "") or "").strip()
        pending_question = str(session.get("pending_question", "") or "").strip()
        if not illness or not pending_question:
            return False

        follow_up_answers = [a for a in session.get("answers", []) if a.get("question") != "illness"]
        if follow_up_answers:
            return False

        last_outbound_at = self._parse_datetime(session.get("last_outbound_at"))
        if not last_outbound_at:
            return False

        seconds_since_question = (datetime.now(timezone.utc) - last_outbound_at).total_seconds()
        if seconds_since_question > 15:
            return False

        normalized_new = self._normalize_for_similarity(message_text)
        normalized_old = self._normalize_for_similarity(illness)
        if not normalized_new or not normalized_old:
            return False

        if normalized_new == normalized_old:
            return True

        similarity = SequenceMatcher(a=normalized_new, b=normalized_old).ratio()
        return similarity >= 0.6

    def _is_repeated_turn(self, session: dict, message: str, topic: str) -> bool:
        normalized_message = self._normalize_for_similarity(message)
        if not normalized_message:
            return False

        previous_questions = [
            self._normalize_for_similarity(answer.get("question", ""))
            for answer in session.get("answers", [])
            if answer.get("question") != "illness"
        ]
        if normalized_message in previous_questions:
            return True

        if topic:
            topic_count = sum(1 for answer in session.get("answers", []) if answer.get("topic") == topic)
            if topic_count >= 1:
                return True
        return False

    def _has_reached_intake_limit(self, session: dict) -> bool:
        max_questions = int(session.get("max_questions", 10) or 10)
        asked_questions = sum(1 for answer in session.get("answers", []) if answer.get("question") != "illness")
        return asked_questions >= max_questions

    def _should_ask_final_question(self, session: dict) -> bool:
        max_questions = int(session.get("max_questions", 10) or 10)
        asked_questions = sum(1 for answer in session.get("answers", []) if answer.get("question") != "illness")
        if asked_questions != max_questions - 1:
            return False
        pending_topic = str(session.get("pending_topic", "") or "").strip()
        if pending_topic == "final_check":
            return False
        asked_topics = {str(answer.get("topic", "") or "").strip() for answer in session.get("answers", [])}
        return "final_check" not in asked_topics

    def _can_complete_intake(self, session: dict, ai_turn: dict) -> bool:
        if str(ai_turn.get("topic", "") or "") == "safety_interrupt":
            return True

        asked_questions = sum(1 for answer in session.get("answers", []) if answer.get("question") != "illness")
        if asked_questions < MIN_FOLLOW_UP_QUESTIONS:
            return False

        fields_missing = [field for field in (ai_turn.get("fields_missing") or []) if isinstance(field, str) and field]
        if not fields_missing:
            return True

        extracted_facts = (ai_turn.get("agent2") or {}).get("extracted_facts") or {}
        substantive_fact_count = sum(
            1
            for value in extracted_facts.values()
            if value not in (None, "", "null")
        )
        if substantive_fact_count < 2:
            return False

        information_gaps = (ai_turn.get("agent2") or {}).get("information_gaps") or []
        return len(information_gaps) == 0

    def _build_recovery_turn(self, language: str, topic: str, session: dict, ai_turn: dict) -> dict | None:
        topic_key = str(topic or session.get("pending_topic") or "").strip()
        covered_topics = set(self._covered_topics_from_session(session))
        missing_topics = [
            item
            for item in (ai_turn.get("fields_missing") or [])
            if isinstance(item, str) and item and item not in covered_topics
        ]

        # If the repeated topic is already covered, jump to the next missing topic instead of re-asking it.
        if missing_topics:
            next_topic = missing_topics[0]
            return {
                "topic": next_topic,
                "message": self.openai._topic_message(next_topic, language),
            }

        # If nothing meaningful remains, stop instead of looping.
        if self._can_complete_intake(session, ai_turn):
            return {
                "topic": "closing",
                "message": self._closing_message(language, session.get("patient_name")),
            }

        recovery_question = self._build_recovery_question(language, topic_key, session)
        if recovery_question and topic_key not in covered_topics:
            return {
                "topic": topic_key or "clarification",
                "message": recovery_question,
            }
        return None

    def _covered_topics_from_session(self, session: dict) -> list[str]:
        return self.openai._extract_covered_topics({"previous_qa_json": session.get("answers", [])})

    @staticmethod
    def _normalized_language(language: str) -> str:
        return normalize_intake_language(str(language or "en"))

    @staticmethod
    def _language_text(variants: dict[str, str], language: str) -> str:
        normalized_language = IntakeChatService._normalized_language(language)
        return variants.get(normalized_language) or variants.get("en", "")

    def _build_recovery_question(self, language: str, topic: str, session: dict) -> str:
        topic_key = str(topic or session.get("pending_topic") or "").strip()
        normalized_language = self._normalized_language(language)
        recovery_questions = INTAKE_RECOVERY_QUESTIONS.get(
            normalized_language,
            INTAKE_RECOVERY_QUESTIONS["en"],
        )
        return recovery_questions.get(topic_key, "")

    def _is_probable_duplicate_reply(self, session: dict, message_text: str) -> bool:
        recent_text = str(session.get("recent_inbound_text", "") or "").strip()
        recent_at = self._parse_datetime(session.get("recent_inbound_at"))
        if not recent_text or not recent_at:
            return False
        if self._normalize_for_similarity(recent_text) != self._normalize_for_similarity(message_text):
            return False
        return (datetime.now(timezone.utc) - recent_at).total_seconds() <= 12

    def _should_reask_chief_complaint(self, message_text: str, patient: dict) -> bool:
        normalized = self._normalize_for_similarity(message_text)
        if not normalized:
            return True

        patient_name = self._normalize_for_similarity(patient.get("name", ""))
        if patient_name and (normalized == patient_name or normalized in patient_name or patient_name in normalized):
            return True

        intro_phrases = {
            "hi",
            "hii",
            "hiii",
            "hello",
            "hey",
            "namaste",
            "namaskar",
            "goodmorning",
            "goodevening",
            "acha",
            "ok",
            "okay",
            "yes",
            "no",
        }
        if normalized in intro_phrases:
            return True

        token_count = len(str(message_text or "").split())
        if token_count <= 2 and normalized.isalpha() and len(normalized) <= 3:
            return True

        return False

    @staticmethod
    def _is_stop_request(message_text: str) -> bool:
        normalized = " ".join(str(message_text or "").strip().lower().split())
        if not normalized:
            return False
        if normalized in STOP_WORDS:
            return True
        stop_phrases = {
            "please stop",
            "stop it",
            "stop now",
            "i want to stop",
            "dont continue",
            "do not continue",
            "mat karo",
            "aage mat badho",
            "ruk jao",
            "ruk jaiye",
            "रोक दो",
            "मत करो",
            "आगे मत बढ़ो",
            "ఆపండి",
            "ఇక్కడ ఆపు",
            "நிறுத்துங்கள்",
            "இங்கே நிறுத்துங்கள்",
            "বন্ধ করুন",
            "এখানেই বন্ধ করুন",
            "थांब",
            "थांबा",
            "इथेच थांब",
            "इथेच थांबा",
            "ನಿಲ್ಲಿಸಿ",
            "ಇಲ್ಲಿಗೆ ನಿಲ್ಲಿಸಿ",
        }
        return normalized in stop_phrases

    def _detect_stop_request(self, *, message_text: str, language: str, answers: list[dict]) -> dict:
        """Best-effort stop detection using LLM first and keyword fallback."""
        try:
            result = self.openai.detect_patient_opt_out(
                message_text=message_text,
                language=language,
                recent_answers=answers[-5:],
            )
        except Exception:
            result = None

        if isinstance(result, dict) and bool(result.get("is_opt_out", False)):
            return {
                "detected": True,
                "source": "llm",
                "confidence": result.get("confidence", ""),
                "reason": result.get("reason", ""),
            }

        keyword_detected = self._is_stop_request(message_text)
        if keyword_detected:
            return {
                "detected": True,
                "source": "keyword_fallback",
                "confidence": "",
                "reason": "",
            }
        return {"detected": False, "source": "", "confidence": "", "reason": ""}

    @staticmethod
    def _stop_confirmation_message(language: str) -> str:
        return IntakeChatService._language_text(INTAKE_STATIC_TEXT["stop_confirmation"], language)

    def _remember_inbound_text(self, session_id: object, message_text: str) -> None:
        self.db.intake_sessions.update_one(
            {"_id": session_id},
            {
                "$set": {
                    "recent_inbound_text": message_text,
                    "recent_inbound_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )

    @staticmethod
    def _closing_message(language: str, patient_name: str | None) -> str:
        name = str(patient_name or "").strip()
        template_key = "closing_named" if name else "closing_unnamed"
        template = IntakeChatService._language_text(INTAKE_STATIC_TEXT[template_key], language)
        return template.format(patient_name=name)

    @staticmethod
    def _final_question(language: str) -> str:
        return IntakeChatService._language_text(INTAKE_STATIC_TEXT["final_question"], language)

    @staticmethod
    def _normalize_for_similarity(text: str) -> str:
        return "".join(ch.lower() for ch in str(text or "") if ch.isalnum())

    @staticmethod
    def _parse_datetime(value: str | None) -> datetime | None:
        if not value:
            return None
        try:
            parsed = datetime.fromisoformat(value)
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            return None

    @staticmethod
    def _fallback_questions(language: str) -> list[str]:
        normalized_language = IntakeChatService._normalized_language(language)
        questions = INTAKE_FALLBACK_QUESTIONS.get(normalized_language, INTAKE_FALLBACK_QUESTIONS["en"])
        return list(questions)

    @staticmethod
    def _auto_generate_pre_visit_summary(session: dict) -> None:
        patient_id = str(session.get("patient_id", "")).strip()
        visit_id = str(session.get("visit_id", "")).strip()
        if not patient_id or not visit_id:
            return
        try:
            GeneratePreVisitSummaryUseCase().execute(patient_id=patient_id, visit_id=visit_id)
        except Exception:
            # Do not block intake completion on summary generation errors.
            return

    @staticmethod
    def _normalize_phone_number(phone_number: str) -> str:
        """Normalize phone number for reliable matching across webhook/provider formats."""
        return "".join(ch for ch in str(phone_number or "") if ch.isdigit())

    @staticmethod
    def _chief_complaint_question(language: str) -> str:
        """Return the question that asks for patient's primary problem."""
        return IntakeChatService._language_text(INTAKE_STATIC_TEXT["chief_complaint"], language)

    @staticmethod
    def _opening_message(language: str) -> str:
        """Return the initial opening message before intake begins."""
        return IntakeChatService._language_text(INTAKE_STATIC_TEXT["opening"], language)
