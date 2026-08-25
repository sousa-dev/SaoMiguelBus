import type { LucideIcon } from 'lucide-react-native';
import { AlertCircle, Inbox } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type StateViewProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
};

function StateLayout({ icon: Icon, title, description, children }: StateViewProps & { children?: React.ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={styles.wrap}>
      {Icon ? <Icon size={40} color={theme.muted} strokeWidth={1.5} /> : null}
      <Text style={[typography.headline, { color: theme.text, textAlign: 'center', marginTop: space.md }]}>{title}</Text>
      {description ? (
        <Text style={[typography.body, { color: theme.muted, textAlign: 'center', marginTop: space.sm }]}>
          {description}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

export function LoadingState({ title }: { title?: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color={theme.primary} />
      {title ? (
        <Text style={[typography.body, { color: theme.muted, marginTop: space.md }]}>{title}</Text>
      ) : null}
    </View>
  );
}

export function EmptyState(props: StateViewProps) {
  return (
    <StateLayout icon={props.icon ?? Inbox} {...props}>
      {props.actionLabel && props.onAction ? (
        <Button label={props.actionLabel} onPress={props.onAction} style={{ marginTop: space.lg }} />
      ) : null}
    </StateLayout>
  );
}

export function ErrorState(props: StateViewProps) {
  return (
    <StateLayout icon={props.icon ?? AlertCircle} {...props}>
      {props.actionLabel && props.onAction ? (
        <Button label={props.actionLabel} variant="outline" onPress={props.onAction} style={{ marginTop: space.lg }} />
      ) : null}
    </StateLayout>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space['2xl'],
  },
});
