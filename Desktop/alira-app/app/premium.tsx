// app/(tabs)/premium.tsx
// Pantalla Alira+ — muestra planes y abre navegador para pagar en la web
// Sin In-App Purchase → sin comisión de Apple/Google

import ScreenHeader from '@/components/ScreenHeader';
import { Colors, Radius, Spacing } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  Linking, SafeAreaView, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';

const WEB_PREMIUM = 'https://www.aliraspace.com/premium';

export default function PremiumScreen() {
  const [isYearly, setIsYearly]   = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [user, setUser]           = useState<any>(null);

  useEffect(() => {
    AsyncStorage.getItem('user').then(u => {
      if (u) {
        const parsed = JSON.parse(u);
        setUser(parsed);
        setIsPremium(parsed.is_premium === true || parsed.plan !== 'free');
      }
    });
  }, []);

  const activar = () => Linking.openURL(WEB_PREMIUM);
  const gestionar = () => Linking.openURL(WEB_PREMIUM);

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Alira+" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroBadge}>
            <Text style={s.heroBadgeText}>Alira+</Text>
          </View>
          <Text style={s.heroTitle}>Tu biblioteca,{'\n'}
            <Text style={{ color: Colors.accent }}>sin límites</Text>
          </Text>
          <Text style={s.heroSub}>
            Lleva el control de todos tus libros, exporta tu colección
            y accede a estadísticas detalladas de tu lectura.
          </Text>
        </View>

        {/* Toggle mensual / anual */}
        <View style={s.toggleRow}>
          <TouchableOpacity onPress={() => setIsYearly(false)}>
            <Text style={[s.toggleLabel, !isYearly && s.toggleLabelActive]}>Mensual</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.toggleSwitch, isYearly && s.toggleSwitchOn]}
            onPress={() => setIsYearly(v => !v)}>
            <View style={[s.toggleKnob, isYearly && s.toggleKnobOn]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsYearly(true)}>
            <Text style={[s.toggleLabel, isYearly && s.toggleLabelActive]}>Anual</Text>
          </TouchableOpacity>
        </View>

        {/* Plans */}
        <View style={s.plansRow}>

          {/* Plan Gratis */}
          <View style={s.planCard}>
            <Text style={s.planName}>GRATIS</Text>
            <View style={s.priceRow}>
              <Text style={s.priceCurrency}>€</Text>
              <Text style={s.priceAmount}>0</Text>
              <Text style={s.pricePeriod}>/ siempre</Text>
            </View>
            <View style={s.features}>
              <Feature text="Hasta 50 libros" />
              <Feature text="Búsqueda y filtros" />
              <Feature text="Vista grid y lista" />
              <Feature text="Fechas de lectura" />
              <Feature text="✨ Wishreads" />
              <Feature text="Exportar colección" muted />
              <Feature text="Estadísticas completas" muted />
              <Feature text="Resumen anual" muted />
            </View>
            <View style={s.freeBtnWrap}>
              <Text style={s.freeBtnText}>
                {!isPremium ? 'Tu plan actual' : 'Plan gratuito'}
              </Text>
            </View>
          </View>

          {/* Plan Alira+ */}
          <View style={[s.planCard, s.planCardFeatured]}>
            <View style={s.popularBadge}>
              <Text style={s.popularBadgeText}>MÁS POPULAR</Text>
            </View>
            <Text style={[s.planName, { color: Colors.accent }]}>ALIRA+</Text>
            <View style={s.priceRow}>
              <Text style={s.priceCurrency}>€</Text>
              <Text style={[s.priceAmount, { color: Colors.text }]}>
                {isYearly ? '29.99' : '2.99'}
              </Text>
              <Text style={s.pricePeriod}>{isYearly ? '/ año' : '/ mes'}</Text>
            </View>
            {isYearly && (
              <View style={s.savingBadge}>
                <Text style={s.savingText}>Ahorras 2 meses</Text>
              </View>
            )}
            <View style={s.features}>
              <Feature text="Libros ilimitados" />
              <Feature text="Búsqueda y filtros" />
              <Feature text="Vista grid y lista" />
              <Feature text="Fechas de lectura" />
              <Feature text="✨ Wishreads" />
              <Feature text="Exportar colección" />
              <Feature text="Estadísticas completas" />
              <Feature text="Resumen anual" />
            </View>
            {isPremium ? (
              <TouchableOpacity style={s.premiumBtn} onPress={gestionar}>
                <Text style={s.premiumBtnText}>Gestionar suscripción</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.premiumBtn} onPress={activar}>
                <Text style={s.premiumBtnText}>Activar Alira+ →</Text>
              </TouchableOpacity>
            )}
            <Text style={s.webNote}>Se abrirá aliraspace.com para completar el pago</Text>
          </View>
        </View>

        {/* FAQ */}
        <View style={s.faq}>
          <Text style={s.faqTitle}>Preguntas frecuentes</Text>
          <FaqItem
            q="¿Puedo cancelar cuando quiera?"
            a="Sí, puedes cancelar en cualquier momento desde tu perfil. Seguirás teniendo acceso hasta el final del período pagado."
          />
          <FaqItem
            q="¿Qué pasa con mis libros si cancelo?"
            a="Tus libros siempre son tuyos. Si tienes más de 50 no podrás añadir nuevos hasta volver a Alira+, pero no perderás ninguno."
          />
          <FaqItem
            q="¿Qué métodos de pago aceptáis?"
            a="Aceptamos todas las tarjetas (Visa, Mastercard, Amex), Apple Pay y Google Pay a través de Stripe."
          />
          <FaqItem
            q="¿Es seguro el pago?"
            a="Sí. Los pagos se procesan 100% a través de Stripe. Alira nunca almacena los datos de tu tarjeta."
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────────────
function Feature({ text, muted }: { text: string; muted?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <Text style={{ color: muted ? Colors.muted : Colors.accent, fontSize: 13, fontWeight: '900' }}>
        {muted ? '–' : '✓'}
      </Text>
      <Text style={{ color: muted ? Colors.muted : Colors.text, fontSize: 13, opacity: muted ? 0.5 : 1 }}>
        {text}
      </Text>
    </View>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity
      style={s.faqItem}
      onPress={() => setOpen(v => !v)}
      activeOpacity={0.7}
    >
      <View style={s.faqRow}>
        <Text style={s.faqQ}>{q}</Text>
        <Text style={{ color: Colors.accent, fontSize: 20 }}>{open ? '−' : '+'}</Text>
      </View>
      {open && <Text style={s.faqA}>{a}</Text>}
    </TouchableOpacity>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll:    { padding: Spacing.lg, paddingBottom: 60 },

  hero:          { alignItems: 'center', paddingTop: 16, paddingBottom: 24 },
  heroBadge:     { backgroundColor: 'rgba(122,162,255,.15)', borderWidth: 1,
                   borderColor: 'rgba(122,162,255,.3)', borderRadius: Radius.full,
                   paddingHorizontal: 14, paddingVertical: 5, marginBottom: 16 },
  heroBadgeText: { color: Colors.accent, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  heroTitle:     { fontSize: 32, fontWeight: '900', color: Colors.text,
                   textAlign: 'center', lineHeight: 40, marginBottom: 12 },
  heroSub:       { color: Colors.muted, fontSize: 15, textAlign: 'center',
                   lineHeight: 22, maxWidth: 320 },

  toggleRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                     gap: 12, marginBottom: 24 },
  toggleLabel:     { fontSize: 14, fontWeight: '600', color: Colors.muted },
  toggleLabelActive:{ color: Colors.text },
  toggleSwitch:    { width: 48, height: 26, backgroundColor: 'rgba(255,255,255,.1)',
                     borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,.12)',
                     justifyContent: 'center', paddingHorizontal: 3 },
  toggleSwitchOn:  { backgroundColor: 'rgba(122,162,255,.3)' },
  toggleKnob:      { width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.text },
  toggleKnobOn:    { alignSelf: 'flex-end' },

  plansRow:        { gap: 16, marginBottom: 32 },
  planCard:        { backgroundColor: Colors.card, borderRadius: 24, padding: 24,
                     borderWidth: 1, borderColor: Colors.border },
  planCardFeatured:{ borderColor: 'rgba(122,162,255,.4)',
                     backgroundColor: 'rgba(122,162,255,.05)' },
  popularBadge:    { alignSelf: 'center', backgroundColor: Colors.accent,
                     borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 4,
                     marginBottom: 16 },
  popularBadgeText:{ color: Colors.bg, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  planName:        { fontSize: 13, fontWeight: '700', color: Colors.muted,
                     letterSpacing: 0.8, marginBottom: 12 },
  priceRow:        { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 4 },
  priceCurrency:   { fontSize: 20, fontWeight: '700', color: Colors.muted },
  priceAmount:     { fontSize: 42, fontWeight: '900', color: Colors.text },
  pricePeriod:     { fontSize: 14, color: Colors.muted },
  savingBadge:     { alignSelf: 'flex-start', backgroundColor: 'rgba(126,232,162,.1)',
                     borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 12 },
  savingText:      { color: '#7ee8a2', fontSize: 12, fontWeight: '600' },
  features:        { marginVertical: 16 },
  freeBtnWrap:     { backgroundColor: 'rgba(255,255,255,.06)', borderRadius: Radius.md,
                     borderWidth: 1, borderColor: 'rgba(255,255,255,.12)',
                     padding: 14, alignItems: 'center' },
  freeBtnText:     { color: Colors.muted, fontSize: 15, fontWeight: '700' },
  premiumBtn:      { backgroundColor: Colors.accent, borderRadius: Radius.md,
                     padding: 15, alignItems: 'center' },
  premiumBtnText:  { color: Colors.bg, fontSize: 16, fontWeight: '800' },
  webNote:         { textAlign: 'center', color: Colors.muted, fontSize: 11, marginTop: 8 },

  faq:      { gap: 0 },
  faqTitle: { fontSize: 20, fontWeight: '800', color: Colors.text,
              textAlign: 'center', marginBottom: 20 },
  faqItem:  { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,.06)', paddingVertical: 16 },
  faqRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQ:     { fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1, paddingRight: 12 },
  faqA:     { color: Colors.muted, fontSize: 14, lineHeight: 22, marginTop: 10 },
});
