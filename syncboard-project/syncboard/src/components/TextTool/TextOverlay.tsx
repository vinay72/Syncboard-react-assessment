import React, { useRef, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { addElement, updateElement as updateElementAction, finalizeElement } from '../../store/slices/boardSlice';
import { ViewTransform, TextElement, Point } from '../../types';
import { nanoid } from 'nanoid';
import wsService from '../../services/websocket';

interface Props {
  viewTransform: ViewTransform;
  getCanvasPoint: (e: React.MouseEvent) => Point;
}

const TextOverlay: React.FC<Props> = ({ viewTransform, getCanvasPoint }) => {
  const dispatch = useAppDispatch();
  const elements = useAppSelector(s => s.board.elements);
  const activeTool = useAppSelector(s => s.tool.activeTool);
  const { color, fontSize, fontFamily, opacity } = useAppSelector(s => s.tool);
  const currentUser = useAppSelector(s => s.user.currentUser);
  const roomId = useAppSelector(s => s.board.roomId);
  const activeElementIds = useAppSelector(s => s.canvas.selectedElementIds);

  const textElements = elements.filter(el => el.type === 'text') as TextElement[];
  const editingElements = textElements.filter(el => el.isEditing);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (activeTool !== 'text') return;
    const point = getCanvasPoint(e);

    // Check if clicking existing text element
    const hit = textElements.find(el =>
      point.x >= el.x && point.x <= el.x + el.width &&
      point.y >= el.y && point.y <= el.y + el.height
    );

    if (hit) {
    dispatch(updateElementAction({ id: hit.id, updates: { isEditing: true } as any }));
      return;
    }

    // Create new text element
    const id = nanoid();
    const newEl: TextElement = {
      id,
      type: 'text',
      userId: currentUser?.id || 'anonymous',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      x: point.x,
      y: point.y,
      width: 200,
      height: 60,
      content: '',
      fontSize,
      fontFamily,
      color,
      bold: false,
      italic: false,
      align: 'left',
      opacity,
      zIndex: elements.length,
      isEditing: true,
    };

    dispatch(addElement(newEl));

    if (roomId && currentUser) {
      wsService.send({ type: 'ADD_ELEMENT', payload: { element: newEl }, userId: currentUser.id, roomId });
    }
  }, [activeTool, textElements, elements.length, fontSize, fontFamily, color, opacity, currentUser, roomId, dispatch, getCanvasPoint]);

  return (
    <div
      style={{ position: 'absolute', inset: 0, pointerEvents: activeTool === 'text' ? 'all' : 'none' }}
      onClick={handleCanvasClick}
    >
      {editingElements.map(el => (
        <EditableText
          key={el.id}
          element={el}
          viewTransform={viewTransform}
          currentUser={currentUser}
          roomId={roomId}
          dispatch={dispatch}
        />
      ))}

      {/* Read-only text elements that are selected */}
      {textElements.filter(el => !el.isEditing && activeElementIds.includes(el.id)).map(el => (
        <SelectableText
          key={el.id}
          element={el}
          viewTransform={viewTransform}
          dispatch={dispatch}
        />
      ))}
    </div>
  );
};

interface EditableTextProps {
  element: TextElement;
  viewTransform: ViewTransform;
  currentUser: any;
  roomId: string | null;
  dispatch: any;
}

const EditableText: React.FC<EditableTextProps> = ({ element, viewTransform, currentUser, roomId, dispatch }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const screenX = element.x * viewTransform.scale + viewTransform.x;
  const screenY = element.y * viewTransform.scale + viewTransform.y;

  const handleBlur = () => {
    const el = { ...element, isEditing: false };
    dispatch(finalizeElement(el));
    if (roomId && currentUser) {
      wsService.send({ type: 'UPDATE_ELEMENT', payload: { elementId: element.id, updates: { content: element.content, isEditing: false } }, userId: currentUser.id, roomId });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch(updateElementAction({ id: element.id, updates: { content: e.target.value } }));
    if (roomId && currentUser) {
      wsService.send({ type: 'UPDATE_ELEMENT', payload: { elementId: element.id, updates: { content: e.target.value } }, userId: currentUser.id, roomId });
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={element.content}
      onChange={handleChange}
      onBlur={handleBlur}
      style={{
        position: 'absolute',
        left: screenX,
        top: screenY,
        width: element.width * viewTransform.scale,
        minHeight: element.height * viewTransform.scale,
        fontSize: element.fontSize * viewTransform.scale,
        fontFamily: element.fontFamily,
        color: element.color,
        fontWeight: element.bold ? 'bold' : 'normal',
        fontStyle: element.italic ? 'italic' : 'normal',
        textAlign: element.align,
        background: 'rgba(255,255,255,0.05)',
        border: '1.5px solid rgba(99,102,241,0.6)',
        borderRadius: '4px',
        padding: '4px 6px',
        outline: 'none',
        resize: 'none',
        overflow: 'hidden',
        pointerEvents: 'all',
        boxShadow: '0 0 0 3px rgba(99,102,241,0.15)',
        backdropFilter: 'blur(2px)',
        zIndex: 100,
      }}
    />
  );
};

interface SelectableTextProps {
  element: TextElement;
  viewTransform: ViewTransform;
  dispatch: any;
}

const SelectableText: React.FC<SelectableTextProps> = ({ element, viewTransform, dispatch }) => {
  const screenX = element.x * viewTransform.scale + viewTransform.x;
  const screenY = element.y * viewTransform.scale + viewTransform.y;

  return (
    <div
      style={{
        position: 'absolute',
        left: screenX,
        top: screenY,
        width: element.width * viewTransform.scale,
        pointerEvents: 'all',
        cursor: 'move',
        border: '1px dashed rgba(99,102,241,0.5)',
        borderRadius: '2px',
      }}
      onDoubleClick={() => dispatch(updateElementAction({ id: element.id, updates: { isEditing: true } as any }))}
    />
  );
};


export default TextOverlay;
