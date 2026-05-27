import { findNodeHandle, ScrollView, UIManager } from 'react-native';
import { RefObject } from 'react';

export function createKeyboardFocusHandler(
  scrollRef: RefObject<ScrollView | null>,
  topOffset = 24,
) {
  return (event: any) => {
    const target = event?.nativeEvent?.target;
    const scroll = scrollRef.current;
    if (!target || !scroll) return;

    const scrollNode = findNodeHandle(scroll);
    if (!scrollNode) return;

    setTimeout(() => {
      UIManager.measureLayout(
        target,
        scrollNode,
        () => {
          (scroll as any)?.scrollResponderScrollNativeHandleToKeyboard(target, topOffset, true);
        },
        (_x, y) => {
          const targetY = Math.max(0, y - topOffset);
          scroll.scrollTo({ y: targetY, animated: true });
        },
      );
    }, 70);
  };
}
