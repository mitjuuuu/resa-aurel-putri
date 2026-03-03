import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Text, Rect, Image, Transformer } from 'react-konva';
import { useEditorStore } from '../store';
import { Download, Type, Image as ImageIcon, Heading, Table, Save, FileText, Trash2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import api from '../api';

const Element = ({ shapeProps, isSelected, onSelect, onChange }: any) => {
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      {shapeProps.type === 'text' || shapeProps.type === 'heading' ? (
        <Text
          onClick={onSelect}
          onTap={onSelect}
          ref={shapeRef}
          {...shapeProps}
          draggable
          fontSize={shapeProps.type === 'heading' ? 24 : shapeProps.fontSize}
          fontStyle={shapeProps.type === 'heading' ? 'bold' : 'normal'}
          onDragEnd={(e) => {
            onChange({
              ...shapeProps,
              x: e.target.x(),
              y: e.target.y(),
            });
          }}
          onTransformEnd={(e) => {
            const node = shapeRef.current;
            const scaleX = node.scaleX();
            const scaleY = node.scaleY();
            node.scaleX(1);
            node.scaleY(1);
            onChange({
              ...shapeProps,
              x: node.x(),
              y: node.y(),
              width: Math.max(5, node.width() * scaleX),
              height: Math.max(node.height() * scaleY),
            });
          }}
        />
      ) : (
        <Rect
          onClick={onSelect}
          onTap={onSelect}
          ref={shapeRef}
          {...shapeProps}
          draggable
          fill="#e5e7eb"
          onDragEnd={(e) => {
            onChange({
              ...shapeProps,
              x: e.target.x(),
              y: e.target.y(),
            });
          }}
        />
      )}
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
};

export default function NexusEditor() {
  const { elements, selectedId, addElement, updateElement, removeElement, setSelectedId, setElements } = useEditorStore();
  const [title, setTitle] = useState('Untitled Document');
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 1100 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth } = containerRef.current;
        const width = Math.min(clientWidth - 40, 800);
        setDimensions({ width, height: width * 1.414 }); // A4 Ratio
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleExport = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [dimensions.width, dimensions.height]
    });

    elements.forEach((el) => {
      if (el.type === 'text' || el.type === 'heading') {
        doc.setFontSize(el.fontSize || 12);
        doc.text(el.content, el.x, el.y, { maxWidth: el.width });
      }
    });

    doc.save(`${title}.pdf`);
  };

  const handleSave = async () => {
    try {
      await api.post('/documents', { title, contentJson: elements });
      alert('Document saved successfully!');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="h-full flex flex-col bg-stone-200 overflow-hidden" ref={containerRef}>
      {/* Toolbar */}
      <div className="h-14 bg-white border-b border-stone-300 flex items-center justify-between px-6 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <input 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="font-serif italic text-lg bg-transparent border-none focus:ring-0 w-48 text-stone-800"
          />
          <div className="h-6 w-px bg-stone-200" />
          <div className="flex items-center gap-1">
            <button onClick={() => addElement({ type: 'heading', content: 'New Heading', fontSize: 24 })} className="p-2 hover:bg-stone-100 rounded-lg text-stone-600" title="Add Heading"><Heading className="w-4 h-4" /></button>
            <button onClick={() => addElement({ type: 'text', content: 'New Text', fontSize: 14 })} className="p-2 hover:bg-stone-100 rounded-lg text-stone-600" title="Add Text"><Type className="w-4 h-4" /></button>
            <button className="p-2 hover:bg-stone-100 rounded-lg text-stone-600" title="Add Image"><ImageIcon className="w-4 h-4" /></button>
            <button className="p-2 hover:bg-stone-100 rounded-lg text-stone-600" title="Add Table"><Table className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedId && (
            <button 
              onClick={() => removeElement(selectedId)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button onClick={handleSave} className="flex items-center gap-2 px-4 py-1.5 bg-white border border-stone-300 rounded-lg text-sm font-medium hover:bg-stone-50 transition-colors">
            <Save className="w-4 h-4" />
            Save
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-1.5 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors">
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto p-10 flex justify-center custom-scrollbar bg-stone-100">
        <div 
          className="bg-white shadow-2xl relative"
          style={{ width: dimensions.width, height: dimensions.height }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedId(null);
          }}
        >
          <Stage
            width={dimensions.width}
            height={dimensions.height}
            ref={stageRef}
            onMouseDown={(e) => {
              const clickedOnEmpty = e.target === e.target.getStage();
              if (clickedOnEmpty) setSelectedId(null);
            }}
          >
            <Layer>
              {elements.map((el, i) => (
                <Element
                  key={el.id}
                  shapeProps={el}
                  isSelected={el.id === selectedId}
                  onSelect={() => setSelectedId(el.id)}
                  onChange={(newAttrs: any) => {
                    updateElement(el.id, newAttrs);
                  }}
                />
              ))}
            </Layer>
          </Stage>
        </div>
      </div>
    </div>
  );
}
