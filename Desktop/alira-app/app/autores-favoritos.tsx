// app/autores-favoritos.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Pantalla para gestionar autores favoritos.
// Accesible desde Perfil → "Mis autores favoritos"
// ─────────────────────────────────────────────────────────────────────────────

import { Colors, Radius, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface FavoriteAuthor {
  id: number;
  author_name: string;
  explicit: boolean;
  notified_at: string | null;
  created: string;
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function AutoresFavoritosScreen() {
  const [favorites, setFavorites] = useState<FavoriteAuthor[]>([]);
  const [inferred, setInferred]   = useState<string[]>([]);
  const [loading, setLoading]     = useState(true);
  const [newAuthor, setNewAuthor] = useState('');
  const [adding, setAdding]       = useState(false);

  // ── Carga de datos ──────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    const { ok, data } = await api.getFavoriteAuthors();
    if (ok) {
      setFavorites(data.data?.favorites ?? []);
      setInferred(data.data?.inferred ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Añadir autor ────────────────────────────────────────────────────────
  const handleAdd = async () => {
    const name = newAuthor.trim();
    if (!name) return;

    // Validar duplicado local
    if (favorites.some(f => f.author_name.toLowerCase() === name.toLowerCase())) {
      Alert.alert('Ya en la lista', 'Este autor ya está entre tus favoritos.');
      return;
    }

    setAdding(true);
    const { ok, data } = await api.addFavoriteAuthor(name);
    setAdding(false);

    if (ok) {
      setNewAuthor('');
      loadData();
    } else {
      Alert.alert('Error', data?.message || 'No se pudo añadir el autor.');
    }
  };

  // ── Añadir inferido como explícito ──────────────────────────────────────
  const handleAddInferred = async (name: string) => {
    setAdding(true);
    const { ok, data } = await api.addFavoriteAuthor(name);
    setAdding(false);
    if (ok) loadData();
    else Alert.alert('Error', data?.message || 'No se pudo añadir el autor.');
  };

  // ── Eliminar autor ──────────────────────────────────────────────────────
  const handleDelete = (fav: FavoriteAuthor) => {
    Alert.alert(
      'Dejar de seguir',
      `¿Quieres dejar de recibir alertas de ${fav.author_name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const { ok } = await api.deleteFavoriteAuthor(fav.id);
            if (ok) loadData();
          },
        },
      ]
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>Autores favoritos</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Descripción */}
        <Text style={s.subtitle}>
          Te avisamos por email cada lunes si alguno de tus autores favoritos publica algo nuevo.
        </Text>

        {/* Input para añadir */}
        <View style={s.addRow}>
          <TextInput
            style={s.input}
            placeholder="Nombre del autor…"
            placeholderTextColor={Colors.muted}
            value={newAuthor}
            onChangeText={setNewAuthor}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[s.addBtn, (!newAuthor.trim() || adding) && s.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!newAuthor.trim() || adding}
          >
            {adding
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.addBtnText}>+</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Lista de favoritos explícitos */}
        {favorites.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Siguiendo</Text>
            {favorites.map(fav => (
              <View key={fav.id} style={s.card}>
                <View style={s.cardLeft}>
                  <Text style={s.authorName}>{fav.author_name}</Text>
                  {fav.notified_at && (
                    <Text style={s.lastNotified}>
                      Última alerta: {new Date(fav.notified_at).toLocaleDateString('es-ES', {
                        day: 'numeric', month: 'short',
                      })}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleDelete(fav)} style={s.deleteBtn}>
                  <Text style={s.deleteText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Autores inferidos (solo si no hay ninguno explícito) */}
        {favorites.length === 0 && inferred.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Sugeridos por tu colección</Text>
            <Text style={s.inferredHint}>
              Basado en tus autores con más libros leídos y mejor valorados.
              Pulsa ＋ para seguirlos oficialmente.
            </Text>
            {inferred.map(name => (
              <View key={name} style={s.card}>
                <Text style={[s.authorName, { flex: 1 }]}>{name}</Text>
                <TouchableOpacity
                  onPress={() => handleAddInferred(name)}
                  style={s.inferredAddBtn}
                >
                  <Text style={s.inferredAddText}>＋ Seguir</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Estado vacío */}
        {favorites.length === 0 && inferred.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🔔</Text>
            <Text style={s.emptyTitle}>Sin autores todavía</Text>
            <Text style={s.emptyText}>
              Añade autores arriba para recibir alertas cuando publiquen algo nuevo.
              Cuantos más libros tengas en tu colección, mejor serán las sugerencias automáticas.
            </Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    marginRight: Spacing.sm,
    padding: 4,
  },
  backText: {
    color: Colors.primary,
    fontSize: 22,
  },
  title: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  scroll: {
    padding: Spacing.md,
    paddingBottom: 60,
  },
  subtitle: {
    color: Colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  addRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.lg,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '300',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardLeft: {
    flex: 1,
  },
  authorName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  lastNotified: {
    color: Colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
    marginLeft: 8,
  },
  deleteText: {
    color: Colors.muted,
    fontSize: 14,
  },
  inferredHint: {
    color: Colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  inferredAddBtn: {
    backgroundColor: Colors.primary + '20',
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  inferredAddText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    color: Colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
