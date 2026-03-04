import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "th" | "ko";

// ─── Translations ─────────────────────────────────────────────────────────────
export const T = {
  en: {
    // Upload page
    uploadTitle: "Upload Track",
    uploadAudioLabel: "Audio File *",
    uploadAudioHint: "MP3, WAV, OGG, FLAC — max 50MB",
    uploadCoverLabel: "Cover Art",
    uploadTitleLabel: "Title *",
    uploadTitlePlaceholder: "My track",
    uploadDescLabel: "Description",
    uploadDescPlaceholder: "Tell the story behind this track...",
    uploadGenreLabel: "Genre",
    uploadBpmLabel: "BPM",
    uploadKeyLabel: "Key",
    uploadTagsLabel: "Tags",
    uploadTagsPlaceholder: "chill, lo-fi, ambient (comma-separated)",
    uploadMoodLabel: "Mood Tags",
    uploadMoodPlaceholder: "chill, energetic, melancholic (comma-separated)",
    uploadMoodHint: "Helps fans discover your track by mood",
    uploadPublishNow: "Publish immediately",
    uploadPublishBtn: "Publish Track",
    uploadDraftBtn: "Save as Draft",
    uploadCreating: "Creating...",
    // Copyright
    copyrightTitle: "Copyright Declaration *",
    copyrightCheck1: "I confirm that I am the original creator and sole copyright holder of this track, or I have obtained all necessary licenses and permissions to upload and distribute this content.",
    copyrightCheck2: "I understand that by uploading this track, I digitally sign and agree to the platform's Terms of Service and Content Policy. I retain all rights to my music.",
    copyrightCheck3: "I acknowledge that the platform assumes zero liability for any copyright infringement claims related to my uploaded content. I take full legal responsibility for any such claims.",
    copyrightDisclaimer: "Platform Disclaimer: This platform serves solely as a hosting and distribution service. We do not claim ownership of uploaded content. All copyright claims and legal responsibility remain entirely with the uploading artist. We reserve the right to remove content upon valid DMCA or copyright infringement notice.",
    copyrightRequired: "You must confirm all copyright declarations before uploading.",
    // AI Consultation
    aiConsultTitle: "AI Music Consultation",
    aiConsultSubtitle: "Want to create AI-generated music?",
    aiConsultBody: "We partner with leading AI music platforms to help you create professional-grade tracks. Whether you're a beginner or an experienced producer, AI tools can help you bring your vision to life.",
    aiConsultCta: "Want to learn how to create AI Music? Contact us!",
    aiConsultSunoLabel: "Try Suno AI →",
    aiConsultSunoNote: "Create full songs from text prompts in seconds",
    aiConsultContact: "Contact Us for AI Music Guidance",
    // Distribution
    distTitle: "Submit for Official Distribution",
    distSubtitle: "Get your music on Spotify, Apple Music, Melon, Genie, Flo & more",
    distBody: "Our team manually curates submissions based on quality. If your music meets our criteria, we will initiate a contract-signing process before proceeding with official album publishing.",
    distFormTitle: "Submit Your Track for Review",
    distNameLabel: "Artist Name",
    distEmailLabel: "Contact Email",
    distTrackLabel: "Track / Album Title",
    distPlatforms: "Desired Platforms",
    distMessageLabel: "Message to Curators",
    distMessagePlaceholder: "Tell us about your music, your story, and why you want to be distributed...",
    distSubmitBtn: "Submit for Review",
    distSubmitting: "Submitting...",
    distSuccess: "Submission received! Our team will review and contact you within 3–5 business days.",
    distNote: "⚠️ Artists cannot auto-publish. All submissions are manually reviewed. Only quality-approved tracks proceed to official distribution and contract signing.",
    distContactDirect: "Or contact us directly:",
    // Nav
    navDistribution: "Distribution",
    navAiConsult: "AI Consult",
  },
  th: {
    uploadTitle: "อัปโหลดเพลง",
    uploadAudioLabel: "ไฟล์เสียง *",
    uploadAudioHint: "MP3, WAV, OGG, FLAC — ขนาดสูงสุด 50MB",
    uploadCoverLabel: "ภาพปก",
    uploadTitleLabel: "ชื่อเพลง *",
    uploadTitlePlaceholder: "ชื่อเพลงของฉัน",
    uploadDescLabel: "คำอธิบาย",
    uploadDescPlaceholder: "เล่าเรื่องราวเบื้องหลังเพลงนี้...",
    uploadGenreLabel: "แนวเพลง",
    uploadBpmLabel: "BPM",
    uploadKeyLabel: "คีย์",
    uploadTagsLabel: "แท็ก",
    uploadTagsPlaceholder: "chill, lo-fi, ambient (คั่นด้วยเครื่องหมายคอมมา)",
    uploadMoodLabel: "แท็กอารมณ์",
    uploadMoodPlaceholder: "ผ่อนคลาย, สนุก, เศร้า (คั่นด้วยเครื่องหมายคอมมา)",
    uploadMoodHint: "ช่วยให้แฟนๆ ค้นพบเพลงของคุณตามอารมณ์",
    uploadPublishNow: "เผยแพร่ทันที",
    uploadPublishBtn: "เผยแพร่เพลง",
    uploadDraftBtn: "บันทึกเป็นฉบับร่าง",
    uploadCreating: "กำลังสร้าง...",
    copyrightTitle: "การประกาศลิขสิทธิ์ *",
    copyrightCheck1: "ฉันยืนยันว่าฉันเป็นผู้สร้างต้นฉบับและเจ้าของลิขสิทธิ์แต่เพียงผู้เดียวของเพลงนี้ หรือได้รับใบอนุญาตและการอนุญาตที่จำเป็นทั้งหมดในการอัปโหลดและเผยแพร่เนื้อหานี้",
    copyrightCheck2: "ฉันเข้าใจว่าการอัปโหลดเพลงนี้ถือเป็นการลงนามดิจิทัลและยอมรับข้อกำหนดการให้บริการและนโยบายเนื้อหาของแพลตฟอร์ม ฉันยังคงสิทธิ์ทั้งหมดในเพลงของฉัน",
    copyrightCheck3: "ฉันรับทราบว่าแพลตฟอร์มไม่รับผิดชอบใดๆ ต่อการละเมิดลิขสิทธิ์ที่เกี่ยวข้องกับเนื้อหาที่ฉันอัปโหลด ฉันรับผิดชอบทางกฎหมายอย่างเต็มที่สำหรับการเรียกร้องดังกล่าว",
    copyrightDisclaimer: "ข้อจำกัดความรับผิดชอบของแพลตฟอร์ม: แพลตฟอร์มนี้ให้บริการเฉพาะในฐานะผู้ให้บริการโฮสติ้งและเผยแพร่เท่านั้น เราไม่อ้างสิทธิ์ความเป็นเจ้าของเนื้อหาที่อัปโหลด ความรับผิดชอบทางลิขสิทธิ์และกฎหมายทั้งหมดเป็นของศิลปินผู้อัปโหลดแต่เพียงผู้เดียว",
    copyrightRequired: "คุณต้องยืนยันการประกาศลิขสิทธิ์ทั้งหมดก่อนอัปโหลด",
    aiConsultTitle: "ปรึกษาเรื่อง AI Music",
    aiConsultSubtitle: "ต้องการสร้างเพลงด้วย AI หรือไม่?",
    aiConsultBody: "เราร่วมมือกับแพลตฟอร์ม AI ด้านดนตรีชั้นนำเพื่อช่วยให้คุณสร้างเพลงระดับมืออาชีพ ไม่ว่าคุณจะเป็นมือใหม่หรือโปรดิวเซอร์ที่มีประสบการณ์",
    aiConsultCta: "ต้องการเรียนรู้วิธีสร้างเพลงด้วย AI? ติดต่อเรา!",
    aiConsultSunoLabel: "ลอง Suno AI →",
    aiConsultSunoNote: "สร้างเพลงสมบูรณ์จากข้อความภายในไม่กี่วินาที",
    aiConsultContact: "ติดต่อเราเพื่อขอคำแนะนำ AI Music",
    distTitle: "ส่งเพลงเพื่อเผยแพร่อย่างเป็นทางการ",
    distSubtitle: "นำเพลงของคุณขึ้น Spotify, Apple Music, Melon, Genie, Flo และอื่นๆ",
    distBody: "ทีมงานของเราคัดเลือกผลงานด้วยตนเองตามคุณภาพ หากเพลงของคุณผ่านเกณฑ์ เราจะเริ่มกระบวนการลงนามสัญญาก่อนดำเนินการเผยแพร่อัลบั้มอย่างเป็นทางการ",
    distFormTitle: "ส่งเพลงของคุณเพื่อรับการพิจารณา",
    distNameLabel: "ชื่อศิลปิน",
    distEmailLabel: "อีเมลติดต่อ",
    distTrackLabel: "ชื่อเพลง / อัลบั้ม",
    distPlatforms: "แพลตฟอร์มที่ต้องการ",
    distMessageLabel: "ข้อความถึงทีมคัดเลือก",
    distMessagePlaceholder: "เล่าเกี่ยวกับเพลงของคุณ เรื่องราว และเหตุผลที่ต้องการเผยแพร่...",
    distSubmitBtn: "ส่งเพื่อรับการพิจารณา",
    distSubmitting: "กำลังส่ง...",
    distSuccess: "รับการส่งเรียบร้อยแล้ว! ทีมงานจะพิจารณาและติดต่อกลับภายใน 3–5 วันทำการ",
    distNote: "⚠️ ศิลปินไม่สามารถเผยแพร่อัตโนมัติได้ การส่งทั้งหมดจะได้รับการตรวจสอบด้วยตนเอง เฉพาะเพลงที่ผ่านการอนุมัติด้านคุณภาพเท่านั้นที่จะดำเนินการเผยแพร่อย่างเป็นทางการ",
    distContactDirect: "หรือติดต่อเราโดยตรง:",
    navDistribution: "การเผยแพร่",
    navAiConsult: "ปรึกษา AI",
  },
  ko: {
    uploadTitle: "트랙 업로드",
    uploadAudioLabel: "오디오 파일 *",
    uploadAudioHint: "MP3, WAV, OGG, FLAC — 최대 50MB",
    uploadCoverLabel: "커버 아트",
    uploadTitleLabel: "제목 *",
    uploadTitlePlaceholder: "내 트랙",
    uploadDescLabel: "설명",
    uploadDescPlaceholder: "이 트랙에 담긴 이야기를 들려주세요...",
    uploadGenreLabel: "장르",
    uploadBpmLabel: "BPM",
    uploadKeyLabel: "키",
    uploadTagsLabel: "태그",
    uploadTagsPlaceholder: "chill, lo-fi, ambient (쉼표로 구분)",
    uploadMoodLabel: "무드 태그",
    uploadMoodPlaceholder: "잔잔한, 신나는, 우울한 (쉼표로 구분)",
    uploadMoodHint: "팬들이 무드별로 트랙을 발견할 수 있도록 도와줍니다",
    uploadPublishNow: "즉시 게시",
    uploadPublishBtn: "트랙 게시",
    uploadDraftBtn: "임시저장",
    uploadCreating: "생성 중...",
    copyrightTitle: "저작권 선언 *",
    copyrightCheck1: "본인은 이 트랙의 원작자이자 단독 저작권 보유자이거나, 이 콘텐츠를 업로드 및 배포하는 데 필요한 모든 라이선스와 허가를 획득했음을 확인합니다.",
    copyrightCheck2: "이 트랙을 업로드함으로써 플랫폼의 서비스 약관 및 콘텐츠 정책에 디지털 서명하고 동의함을 이해합니다. 음악에 대한 모든 권리는 본인에게 있습니다.",
    copyrightCheck3: "플랫폼은 업로드된 콘텐츠와 관련된 저작권 침해 클레임에 대해 일체의 책임을 지지 않음을 인정합니다. 본인은 그러한 클레임에 대한 모든 법적 책임을 집니다.",
    copyrightDisclaimer: "플랫폼 면책 조항: 이 플랫폼은 순전히 호스팅 및 배포 서비스로만 제공됩니다. 업로드된 콘텐츠에 대한 소유권을 주장하지 않습니다. 모든 저작권 청구 및 법적 책임은 전적으로 업로드하는 아티스트에게 있습니다.",
    copyrightRequired: "업로드하기 전에 모든 저작권 선언을 확인해야 합니다.",
    aiConsultTitle: "AI 음악 컨설팅",
    aiConsultSubtitle: "AI로 음악을 만들고 싶으신가요?",
    aiConsultBody: "저희는 선도적인 AI 음악 플랫폼과 파트너십을 맺어 전문 수준의 트랙을 제작할 수 있도록 지원합니다. 초보자든 경험 많은 프로듀서든 AI 도구가 여러분의 비전을 실현시켜 드립니다.",
    aiConsultCta: "AI 음악 제작 방법을 배우고 싶으신가요? 문의하세요!",
    aiConsultSunoLabel: "Suno AI 체험하기 →",
    aiConsultSunoNote: "텍스트 프롬프트로 몇 초 만에 완성된 노래 제작",
    aiConsultContact: "AI 음악 가이드 문의하기",
    distTitle: "공식 배포 신청",
    distSubtitle: "Spotify, Apple Music, 멜론, 지니, 플로 등에 음악을 등록하세요",
    distBody: "저희 팀은 품질을 기준으로 제출물을 직접 심사합니다. 음악이 기준을 충족하면 공식 앨범 배포 전에 계약 체결 절차를 시작합니다.",
    distFormTitle: "심사를 위한 트랙 제출",
    distNameLabel: "아티스트 이름",
    distEmailLabel: "연락처 이메일",
    distTrackLabel: "트랙 / 앨범 제목",
    distPlatforms: "희망 플랫폼",
    distMessageLabel: "큐레이터에게 메시지",
    distMessagePlaceholder: "음악, 스토리, 배포를 원하는 이유를 알려주세요...",
    distSubmitBtn: "심사 신청",
    distSubmitting: "제출 중...",
    distSuccess: "제출이 완료되었습니다! 팀에서 검토 후 3~5 영업일 이내에 연락드리겠습니다.",
    distNote: "⚠️ 아티스트는 자동으로 게시할 수 없습니다. 모든 제출물은 수동으로 검토됩니다. 품질 승인된 트랙만 공식 배포 및 계약 체결로 진행됩니다.",
    distContactDirect: "또는 직접 문의하세요:",
    navDistribution: "배포 신청",
    navAiConsult: "AI 컨설팅",
  },
};

// ─── Context ──────────────────────────────────────────────────────────────────
interface LangContextType {
  lang: Lang;
  t: typeof T["en"];
}

const LangContext = createContext<LangContextType>({ lang: "en", t: T.en });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    // Detect language via IP geolocation
    fetch("https://ipapi.co/json/")
      .then((r) => r.json())
      .then((data) => {
        const country: string = data?.country_code ?? "";
        if (country === "KR") setLang("ko");
        else if (country === "TH") setLang("th");
        else setLang("en");
      })
      .catch(() => setLang("en")); // fallback to English on error
  }, []);

  return (
    <LangContext.Provider value={{ lang, t: T[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
