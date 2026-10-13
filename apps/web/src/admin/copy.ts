import type { Locale } from '@el-dabboos/domain';
import { ApiClientError } from '../api/client.ts';

const labels: Record<string, readonly [string, string]> = {
    active: ['Active', 'نشط'], suspended: ['Suspended', 'معلق'], invited: ['Invited', 'مدعو'],
    provisioning: ['Provisioning', 'قيد التجهيز'], disabled: ['Disabled', 'معطل'],
    private: ['Private', 'خاصة'], tenant: ['Tenant', 'مساحة العمل'], restricted: ['Restricted', 'مقيدة'],
    region: ['Region', 'المنطقة'], branch: ['Branch', 'الفرع'], salesperson: ['Salesperson', 'مندوب المبيعات'],
    name: ['Name', 'الاسم'], customer: ['Customer', 'العميل'], status: ['Status', 'الحالة'],
    countryCode: ['Country', 'الدولة'], defaultLocale: ['Default locale', 'اللغة الافتراضية'],
    arabicDialect: ['Arabic profile', 'ملف العربية'], reportingCurrency: ['Reporting currency', 'عملة التقارير'],
    timeZone: ['Time zone', 'المنطقة الزمنية'], en: ['English', 'الإنجليزية'], ar: ['Arabic', 'العربية'],
    iq: ['Iraqi Arabic', 'العربية العراقية'], eg: ['Egyptian Arabic', 'العربية المصرية'],
};
export function administrationLabel(value: string, locale: Locale): string {
    return labels[value]?.[locale === 'ar' ? 1 : 0] ?? value;
}

const errors: Record<string, readonly [string, string]> = {
    INVALID_AI_SETTINGS: ['Review the AI settings and numeric limits.', 'راجع إعدادات AI والحدود الرقمية.'],
    AI_ENDPOINT_NOT_ALLOWED: ['Use the OpenRouter URL or the server-configured local endpoint.', 'استخدم رابط OpenRouter أو الرابط المحلي المعدّ في الخادم.'],
    AI_MODEL_UNSUPPORTED: ['Select a compatible model from the model list.', 'اختر نموذجًا متوافقًا من قائمة النماذج.'],
    AI_TOKEN_LIMIT: ['Reduce the output-token limit to the model maximum.', 'قلّل حد رموز الإخراج ليتوافق مع الحد الأقصى للنموذج.'],
    AI_REASONING_UNSUPPORTED: ['Select a reasoning level supported by this model.', 'اختر مستوى تفكير يدعمه هذا النموذج.'],
    AI_SEED_UNSUPPORTED: ['This model does not support a seed. Leave it blank.', 'لا يدعم هذا النموذج البذرة. اتركها فارغة.'],
    AI_MODELS_UNAVAILABLE: ['Could not load models. Check the provider and API key.', 'تعذر تحميل النماذج. راجع المزود ومفتاح API.'],
    INVALID_AI_KEY: ['Enter a valid API key, or explicitly clear the saved key.', 'أدخل مفتاح API صالحًا أو احذف المفتاح المحفوظ صراحةً.'],
    AI_KEY_STORAGE_UNAVAILABLE: ['A protected server secret is required to save API keys.', 'يلزم سر خادم محمي لحفظ مفاتيح API.'],

    USER_PROVISIONING_FAILED: ['Unable to create this user. Review the email and account state.', 'تعذر إنشاء المستخدم. راجع البريد الإلكتروني وحالة الحساب.'],
    USER_PROVISIONING_LIMITED: ['Too many user creation attempts. Try again shortly.', 'محاولات إنشاء المستخدمين كثيرة. حاول بعد قليل.'],
    VERSION_CONFLICT: ['This record changed. Reload and review before saving again.', 'تغير هذا السجل. أعد التحميل وراجع التغييرات قبل الحفظ مجدداً.'],
    ACCESS_DENIED: ['You do not have access to this action.', 'ليس لديك صلاحية لهذا الإجراء.'],
    NOT_FOUND: ['This resource is unavailable.', 'هذا المورد غير متاح.'],
    IDENTITY_REQUIRED: ['Select an active demo identity.', 'اختر هوية تجريبية نشطة.'],
    PROTECTED_ROLE: ['System roles cannot be changed.', 'لا يمكن تغيير أدوار النظام.'],
    ROLE_IN_USE: ['This role is assigned or used by a dashboard grant.', 'هذا الدور معين لعضوية أو مستخدم في منح عرض لوحة.'],
    LAST_ADMIN: ['Keep at least one active administrator.', 'يجب الإبقاء على مسؤول نشط واحد على الأقل.'],
    STALE_DATA_SCOPE: ['Some data access values are outdated. Review their replacements.', 'بعض قيم الوصول للبيانات قديمة. راجع القيم البديلة.'],
    INVALID_ADMIN_INPUT: ['Review the form values before saving.', 'راجع قيم النموذج قبل الحفظ.'],
    DATA_NOT_READY: ['Analytics data is not ready. Scope editing is unavailable.', 'بيانات التحليلات غير جاهزة. تعديل نطاق البيانات غير متاح.'],
    ADMIN_UNAVAILABLE: ['Administration is unavailable. Reload to review the current state.', 'الإدارة غير متاحة. أعد التحميل لمراجعة الحالة الحالية.'],
};
export function administrationError(error: unknown, locale: Locale): string {
    const copy = error instanceof ApiClientError ? errors[error.code] : undefined;
    if (copy) return copy[locale === 'ar' ? 1 : 0];
    return locale === 'ar' ? 'تعذر إكمال الطلب. أعد التحميل وحاول مجدداً.' : 'The request could not be completed. Reload and try again.';
}
