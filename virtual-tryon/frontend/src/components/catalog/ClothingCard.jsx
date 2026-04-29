import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { useAppContext } from '../../context/AppContext';

const ClothingCard = ({ item }) => {
  const navigate = useNavigate();

  const handleTryOn = () => {
    navigate('/try-on', { state: { selectedItem: item } });
  };

  const { state: appState, addSavedLook, removeSavedLook } = useAppContext();
  const isSaved = appState.savedLooks.some(s => s.id === item.id);

  const toggleSave = (e) => {
    e.stopPropagation();
    if (isSaved) {
      removeSavedLook(item.id);
    } else {
      // store a lightweight item object
      addSavedLook({ id: item.id, clothingName: item.name, clothingImage: item.image, price: item.price, brand: item.brand });
    }
  };

  return (
    <motion.div 
      whileHover="hover"
      className="group bg-white rounded-2xl overflow-hidden border border-border shadow-sm transition-shadow hover:shadow-md h-full flex flex-col"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-bg-tertiary">
        <img 
          src={item.image} 
          alt={item.name} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Hover overlay actions */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-4">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            variants={{ hover: { y: 0, opacity: 1 } }}
            transition={{ duration: 0.2 }}
            className="w-full flex gap-2"
          >
            <Button className="flex-1 rounded-xl bg-white text-secondary hover:bg-bg-tertiary shadow-lg" onClick={handleTryOn}>
              Try On
            </Button>
            <button
              onClick={toggleSave}
              aria-pressed={isSaved}
              className={`w-11 h-11 rounded-xl shadow-lg flex items-center justify-center transition-colors ${isSaved ? 'bg-pink-100 text-pink-600' : 'bg-white text-secondary hover:text-error hover:bg-red-50'}`}
              title={isSaved ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart size={20} />
            </button>
          </motion.div>
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {item.seasons.slice(0, 2).map((season, idx) => (
            <Badge key={idx} variant="default" className="bg-white/90 backdrop-blur-sm text-[10px] py-1 shadow-sm border border-white/20">
              {season}
            </Badge>
          ))}
          {item.seasons.length > 2 && (
            <Badge variant="default" className="bg-white/90 backdrop-blur-sm text-[10px] py-1 shadow-sm w-fit">
              +{item.seasons.length - 2} more
            </Badge>
          )}
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="text-xs text-text-muted mb-1 font-medium tracking-wide uppercase">{item.brand}</div>
        <h3 className="font-bold text-secondary text-sm mb-2 line-clamp-1">{item.name}</h3>
        <div className="mt-auto flex items-center justify-between">
          <span className="font-bold text-lg">${item.price.toFixed(2)}</span>
          <div 
            className="w-5 h-5 rounded-full border border-black/10 shadow-sm"
            style={{ backgroundColor: item.primaryColor }}
            title={item.colorFamily}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default ClothingCard;
