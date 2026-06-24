const STUDENT_NOTIFICATION_PATH = '/student/notifikasi';
const STUDENT_COUNSELING_HISTORY_PATH = '/student/counseling/history';
const STUDENT_REFERRALS_PATH = `${STUDENT_COUNSELING_HISTORY_PATH}?tab=referrals`;

const getLowerText = (...values) => values
  .filter(Boolean)
  .join(' ')
  .toLowerCase();

const normalizeStudentPath = (link) => {
  if (!link) return '';

  try {
    const url = new URL(link, window.location.origin);
    if (url.origin !== window.location.origin) return link;
    link = `${url.pathname}${url.search}${url.hash}`;
  } catch (e) {
    // Keep relative links as-is.
  }

  const lowerLink = link.toLowerCase();
  if (lowerLink === '/student/notification' || lowerLink === '/student/notifications') {
    return STUDENT_NOTIFICATION_PATH;
  }
  if (lowerLink.includes('/student/student-voice')) {
    return link.replace('/student/student-voice', '/student/voice');
  }
  if (
    lowerLink.includes('referral') ||
    lowerLink.includes('rujukan') ||
    lowerLink.includes('tindak-lanjut') ||
    lowerLink.includes('tindak_lanjut')
  ) {
    return STUDENT_REFERRALS_PATH;
  }
  if (lowerLink === '/student/counseling/referrals') {
    return STUDENT_REFERRALS_PATH;
  }

  return link;
};

export const resolveStudentNotificationLink = (notification = {}) => {
  const rawLink = notification.link ?? notification.Link ?? '';
  const type = (notification.type ?? notification.Type ?? notification.tipe ?? notification.Tipe ?? '').toLowerCase();
  const text = getLowerText(
    notification.title,
    notification.Title,
    notification.judul,
    notification.Judul,
    notification.content,
    notification.desc,
    notification.pesan,
    notification.Pesan,
    notification.deskripsi,
    notification.Deskripsi,
    rawLink
  );

  if (
    text.includes('surat rujukan') ||
    text.includes('rujukan') ||
    text.includes('tindak lanjut') ||
    text.includes('tindak_lanjut') ||
    text.includes('referral')
  ) {
    if (type === 'health' || type === 'referral_medis' || rawLink.includes('/student/health')) {
      return '/student/health';
    }
    return STUDENT_REFERRALS_PATH;
  }

  const normalizedLink = normalizeStudentPath(rawLink);
  if (normalizedLink) return normalizedLink;

  if (type === 'konseling') return STUDENT_COUNSELING_HISTORY_PATH;
  if (type === 'beasiswa') return '/student/scholarship';
  if (type === 'achievement' || type === 'prestasi') return '/student/achievement';
  if (type === 'student_voice' || type === 'aspirasi') return '/student/voice';
  if (type === 'kencana') {
    if (text.includes('undangan') || text.includes('kelompok') || text.includes('pembimbing')) {
      return '/student/kencana/invitations';
    }
    return '/student/kencana';
  }

  return STUDENT_NOTIFICATION_PATH;
};
