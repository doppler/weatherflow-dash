import React, { memo, useEffect, useState } from 'react';
import './RapWindsAloft.less';

const RapWindsAloft: React.FC = () => {
  const [data, setData]: [Partial<RAPWindsAloftData>, any] = useState({});

  const fetchWindsAloft = async () => {
    const host =
      document.location.hostname === 'localhost'
        ? 'http://localhost:3001'
        : `${document.location.protocol}//${document.location.host}`;
    const url = `${host}/winds-aloft`;
    const result = await fetch(url);
    const data = await result.json();
    setData(data);
  };

  useEffect(() => {
    fetchWindsAloft();
    const interval = setInterval(() => {
      console.log('fetching wa on interval');
      fetchWindsAloft();
    }, 1000 * 60 * 10);
    return () => clearInterval(interval);
  }, []);

  const surface = data.soundings?.find(s => s.linType === 9);

  return (
    <div id="RAPWindsAloft">
      {data.soundings?.reverse().map((sounding, i) => (
        <div className="sounding" key={i}>
          <div className="center">{sounding.altitude.feetAGL} ft.</div>
          <div className="center">{sounding.windSpd.mph} mph</div>
          <Arrow dir={sounding.windDir} />
          <div className="center">{sounding.windDir}°</div>
          <div className="center">{sounding.temp.f}°F</div>
        </div>
      ))}
      {/* <div
        style={{
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        {surface &&
          `Calculated Cloud base: ${Math.round(
            ((surface.temp.c - surface.dewPt.c) / 2.5) * 1000
          )} ft`}
      </div> */}
    </div>
  );
};

const Arrow: React.FC<{ dir: number }> = ({ dir }) => (
  <svg viewBox="0 0 512 512" height="2em" width="2em">
    <circle
      cx="256"
      cy="256"
      r="237.32505032019532"
      fill="hsl(210, 100%, 33%)"
      stroke="hsl(210, 100%, 66%)"
      strokeWidth="37.349899359609346"
    />
    <path
      d="
        M 260.4 0 
        L 269.56814539771983 274.6749500197458 
        L 313.475583094649 335.1083534400135 
        L 256 512 
        L 198.52441690535102 335.1083534400135 
        L 242.43185460228014 274.6749500197458 
        L 251.6 0 
        Z"
      fill="hsl(30, 100%, 50%)"
      transform={`rotate(${dir}, 256, 256)`}
    />
  </svg>
);
export default memo(RapWindsAloft);
