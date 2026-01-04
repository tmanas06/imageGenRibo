/**
 * Hindi Text Overlay Editor
 * Visual tool to:
 * 1. Define areas to cover with background color
 * 2. Position Hindi text precisely
 * 3. Sample background colors from image
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface CoverArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TextRegion {
  id: string;
  hindiText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right';
  textColor: string;
  coverArea?: CoverArea;
  sampledColor?: string;
}

interface Props {
  imageBase64: string;
  onExport: (regions: TextRegion[], resultImage: string) => void;
}

// Hindi translations
const HINDI_TEXTS = {
  claim1: '5 मिनट में तेज़ असर',
  claim2: '12 घंटे लंबे समय तक राहत',
  claim3: 'तीव्रता को 12%-15% तक कम करता है',
  claim4: 'फेफड़ों की क्षमता में 120 ml सुधार',
  disclaimer: 'केवल पंजीकृत चिकित्सक या अस्पताल या प्रयोगशाला के उपयोग के लिए'
};

export const HindiOverlayEditor: React.FC<Props> = ({ imageBase64, onExport }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [regions, setRegions] = useState<TextRegion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<'select' | 'cover' | 'text' | 'sample'>('select');
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        canvas.width = img.width;
        canvas.height = img.height;
        redrawCanvas(img);
      }
    };
    img.src = `data:image/png;base64,${imageBase64}`;
  }, [imageBase64]);

  // Redraw canvas
  const redrawCanvas = useCallback((img?: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw image
    if (img) {
      ctx.drawImage(img, 0, 0);
    } else {
      const tempImg = new Image();
      tempImg.onload = () => {
        ctx.drawImage(tempImg, 0, 0);
        drawOverlays(ctx);
      };
      tempImg.src = `data:image/png;base64,${imageBase64}`;
      return;
    }

    drawOverlays(ctx);
  }, [imageBase64, regions, selectedId]);

  // Draw overlays (cover areas and text)
  const drawOverlays = (ctx: CanvasRenderingContext2D) => {
    for (const region of regions) {
      // Draw cover area
      if (region.coverArea) {
        const { x, y, width, height } = region.coverArea;
        const actualX = (x / 100) * imageSize.width;
        const actualY = (y / 100) * imageSize.height;
        const actualW = (width / 100) * imageSize.width;
        const actualH = (height / 100) * imageSize.height;

        // Fill with sampled or default color
        ctx.fillStyle = region.sampledColor || '#f5f0e8';
        ctx.fillRect(actualX, actualY, actualW, actualH);

        // Draw border if selected
        if (selectedId === region.id) {
          ctx.strokeStyle = '#2196F3';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(actualX, actualY, actualW, actualH);
          ctx.setLineDash([]);
        }
      }

      // Draw Hindi text
      const textX = (region.x / 100) * imageSize.width;
      const textY = (region.y / 100) * imageSize.height;
      const textW = (region.width / 100) * imageSize.width;
      
      const scaleFactor = Math.min(imageSize.width / 1920, imageSize.height / 1080);
      const fontSize = Math.round(region.fontSize * scaleFactor);

      ctx.font = `${region.fontWeight} ${fontSize}px "Noto Sans Devanagari", sans-serif`;
      ctx.fillStyle = region.textColor;
      ctx.textAlign = region.textAlign;
      ctx.textBaseline = 'top';

      let drawX = textX;
      if (region.textAlign === 'center') drawX = textX + textW / 2;
      if (region.textAlign === 'right') drawX = textX + textW;

      ctx.fillText(region.hindiText, drawX, textY);

      // Draw text region border if selected
      if (selectedId === region.id) {
        const actualH = (region.height / 100) * imageSize.height;
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 2;
        ctx.strokeRect(textX, textY, textW, actualH);
      }
    }
  };

  // Refresh canvas when regions change
  useEffect(() => {
    redrawCanvas();
  }, [regions, selectedId, redrawCanvas]);

  // Get mouse position as percentage
  const getMousePercent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = ((e.clientX - rect.left) * scaleX / canvas.width) * 100;
    const y = ((e.clientY - rect.top) * scaleY / canvas.height) * 100;
    
    return { x, y };
  };

  // Sample color at point
  const sampleColorAt = (x: number, y: number): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '#f5f0e8';
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return '#f5f0e8';

    const actualX = (x / 100) * canvas.width;
    const actualY = (y / 100) * canvas.height;
    
    const pixel = ctx.getImageData(actualX, actualY, 1, 1).data;
    return `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
  };

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePercent(e);

    if (mode === 'sample' && selectedId) {
      // Sample color and apply to selected region
      const color = sampleColorAt(pos.x, pos.y);
      setRegions(regions.map(r => 
        r.id === selectedId ? { ...r, sampledColor: color } : r
      ));
      setMode('select');
    }
  };

  // Handle mouse down for drawing
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== 'cover' && mode !== 'text') return;
    
    const pos = getMousePercent(e);
    setStartPos(pos);
    setDrawing(true);
  };

  // Handle mouse up
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    
    const endPos = getMousePercent(e);
    const x = Math.min(startPos.x, endPos.x);
    const y = Math.min(startPos.y, endPos.y);
    const width = Math.abs(endPos.x - startPos.x);
    const height = Math.abs(endPos.y - startPos.y);

    if (width < 2 || height < 2) {
      setDrawing(false);
      return;
    }

    if (mode === 'cover' && selectedId) {
      // Set cover area for selected region
      setRegions(regions.map(r => 
        r.id === selectedId ? { ...r, coverArea: { x, y, width, height } } : r
      ));
    } else if (mode === 'text') {
      // Create new text region
      const newRegion: TextRegion = {
        id: `region-${Date.now()}`,
        hindiText: 'हिंदी टेक्स्ट',
        x, y, width, height,
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        textColor: '#d35400'
      };
      setRegions([...regions, newRegion]);
      setSelectedId(newRegion.id);
    }

    setDrawing(false);
    setMode('select');
  };

  // Add predefined region
  const addPredefinedRegion = (key: keyof typeof HINDI_TEXTS) => {
    const newRegion: TextRegion = {
      id: `region-${Date.now()}`,
      hindiText: HINDI_TEXTS[key],
      x: 30,
      y: 70,
      width: 15,
      height: 10,
      fontSize: 22,
      fontWeight: 'bold',
      textAlign: 'center',
      textColor: '#d35400'
    };
    setRegions([...regions, newRegion]);
    setSelectedId(newRegion.id);
  };

  // Update selected region
  const updateRegion = (updates: Partial<TextRegion>) => {
    if (!selectedId) return;
    setRegions(regions.map(r => 
      r.id === selectedId ? { ...r, ...updates } : r
    ));
  };

  // Delete selected region
  const deleteRegion = () => {
    if (!selectedId) return;
    setRegions(regions.filter(r => r.id !== selectedId));
    setSelectedId(null);
  };

  // Export final image
  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resultBase64 = canvas.toDataURL('image/png').split(',')[1];
    onExport(regions, resultBase64);
  };

  const selectedRegion = regions.find(r => r.id === selectedId);

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '20px' }}>
      {/* Canvas */}
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setMode('select')}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: mode === 'select' ? '#2196F3' : '#eee',
              color: mode === 'select' ? 'white' : 'black',
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Select
          </button>
          <button 
            onClick={() => setMode('text')}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: mode === 'text' ? '#4CAF50' : '#eee',
              color: mode === 'text' ? 'white' : 'black',
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            + Text Region
          </button>
          <button 
            onClick={() => setMode('cover')}
            disabled={!selectedId}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: mode === 'cover' ? '#ff9800' : '#eee',
              color: mode === 'cover' ? 'white' : 'black',
              border: 'none', 
              borderRadius: '4px',
              cursor: selectedId ? 'pointer' : 'not-allowed',
              opacity: selectedId ? 1 : 0.5
            }}
          >
            Draw Cover Area
          </button>
          <button 
            onClick={() => setMode('sample')}
            disabled={!selectedId}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: mode === 'sample' ? '#9c27b0' : '#eee',
              color: mode === 'sample' ? 'white' : 'black',
              border: 'none', 
              borderRadius: '4px',
              cursor: selectedId ? 'pointer' : 'not-allowed',
              opacity: selectedId ? 1 : 0.5
            }}
          >
            Sample Color
          </button>
          <button 
            onClick={handleExport}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer',
              marginLeft: 'auto'
            }}
          >
            Export Image
          </button>
        </div>
        
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          style={{ 
            maxWidth: '100%', 
            border: '1px solid #ddd',
            cursor: mode === 'sample' ? 'crosshair' : 
                   mode === 'cover' || mode === 'text' ? 'crosshair' : 'default'
          }}
        />
        
        <div style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
          {mode === 'select' && 'Click on canvas to select regions'}
          {mode === 'text' && 'Draw rectangle to add text region'}
          {mode === 'cover' && 'Draw rectangle to define cover area for selected region'}
          {mode === 'sample' && 'Click on canvas to sample background color'}
        </div>
      </div>

      {/* Properties Panel */}
      <div style={{ width: '300px', backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 15px 0' }}>Properties</h3>
        
        {/* Quick Add */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
            Quick Add Hindi Text:
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {Object.entries(HINDI_TEXTS).map(([key, text]) => (
              <button
                key={key}
                onClick={() => addPredefinedRegion(key as keyof typeof HINDI_TEXTS)}
                style={{
                  padding: '8px',
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                {text.substring(0, 30)}...
              </button>
            ))}
          </div>
        </div>

        {selectedRegion && (
          <>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                Hindi Text:
              </label>
              <textarea
                value={selectedRegion.hindiText}
                onChange={(e) => updateRegion({ hindiText: e.target.value })}
                style={{ width: '100%', padding: '8px', minHeight: '60px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>X (%)</label>
                <input
                  type="number"
                  value={Math.round(selectedRegion.x)}
                  onChange={(e) => updateRegion({ x: Number(e.target.value) })}
                  style={{ width: '100%', padding: '6px' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Y (%)</label>
                <input
                  type="number"
                  value={Math.round(selectedRegion.y)}
                  onChange={(e) => updateRegion({ y: Number(e.target.value) })}
                  style={{ width: '100%', padding: '6px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Width (%)</label>
                <input
                  type="number"
                  value={Math.round(selectedRegion.width)}
                  onChange={(e) => updateRegion({ width: Number(e.target.value) })}
                  style={{ width: '100%', padding: '6px' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Font Size</label>
                <input
                  type="number"
                  value={selectedRegion.fontSize}
                  onChange={(e) => updateRegion({ fontSize: Number(e.target.value) })}
                  style={{ width: '100%', padding: '6px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Text Color</label>
              <input
                type="color"
                value={selectedRegion.textColor}
                onChange={(e) => updateRegion({ textColor: e.target.value })}
                style={{ width: '100%', height: '40px' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Text Align</label>
              <select
                value={selectedRegion.textAlign}
                onChange={(e) => updateRegion({ textAlign: e.target.value as 'left' | 'center' | 'right' })}
                style={{ width: '100%', padding: '8px' }}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>

            {selectedRegion.coverArea && (
              <div style={{ 
                padding: '10px', 
                backgroundColor: '#e3f2fd', 
                borderRadius: '4px',
                marginBottom: '15px'
              }}>
                <strong>Cover Area:</strong><br/>
                X: {Math.round(selectedRegion.coverArea.x)}%, 
                Y: {Math.round(selectedRegion.coverArea.y)}%<br/>
                W: {Math.round(selectedRegion.coverArea.width)}%, 
                H: {Math.round(selectedRegion.coverArea.height)}%
              </div>
            )}

            {selectedRegion.sampledColor && (
              <div style={{ 
                padding: '10px', 
                backgroundColor: '#f3e5f5', 
                borderRadius: '4px',
                marginBottom: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  backgroundColor: selectedRegion.sampledColor,
                  border: '1px solid #999',
                  borderRadius: '4px'
                }} />
                <span>Sampled: {selectedRegion.sampledColor}</span>
              </div>
            )}

            <button
              onClick={deleteRegion}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Delete Region
            </button>
          </>
        )}

        {/* Region List */}
        <div style={{ marginTop: '20px' }}>
          <h4>All Regions ({regions.length})</h4>
          {regions.map((region, i) => (
            <div
              key={region.id}
              onClick={() => setSelectedId(region.id)}
              style={{
                padding: '8px',
                marginBottom: '5px',
                backgroundColor: selectedId === region.id ? '#e3f2fd' : '#fff',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              #{i + 1}: {region.hindiText.substring(0, 20)}...
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HindiOverlayEditor;
