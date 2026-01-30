import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

type Tab = 'farm' | 'shop' | 'wallet';

interface GameState {
  chickens: number;
  eggs: number;
  balance: number;
  lastCollect: number;
  userId: string;
}

const CHICKEN_PRICE = 1;
const EGG_PRODUCTION_RATE = 0.014;
const COLLECT_INTERVAL = 3600000;

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>('farm');
  const [gameState, setGameState] = useState<GameState>({
    chickens: 0,
    eggs: 0,
    balance: 0,
    lastCollect: Date.now(),
    userId: '',
  });
  const [timeUntilCollect, setTimeUntilCollect] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('kuryatnik_game');
    if (saved) {
      const parsed = JSON.parse(saved);
      setGameState(parsed);
    } else {
      const newUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setGameState(prev => ({ ...prev, userId: newUserId }));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('kuryatnik_game', JSON.stringify(gameState));
  }, [gameState]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (gameState.chickens > 0) {
        const now = Date.now();
        const timeSinceLastCollect = now - gameState.lastCollect;
        const remaining = COLLECT_INTERVAL - timeSinceLastCollect;
        
        if (remaining <= 0) {
          setTimeUntilCollect(0);
        } else {
          setTimeUntilCollect(remaining);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState.chickens, gameState.lastCollect]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const collectEggs = () => {
    if (gameState.chickens === 0) {
      toast.error('У вас нет кур! Купите кур в магазине');
      return;
    }

    const now = Date.now();
    const timeSinceLastCollect = now - gameState.lastCollect;

    if (timeSinceLastCollect < COLLECT_INTERVAL) {
      toast.error('Подождите, куры еще несут яйца!');
      return;
    }

    const eggsProduced = gameState.chickens * (EGG_PRODUCTION_RATE * 60);
    setGameState(prev => ({
      ...prev,
      eggs: prev.eggs + eggsProduced,
      lastCollect: now,
    }));
    toast.success(`Собрано ${eggsProduced.toFixed(2)} яиц!`);
  };

  const buyChicken = () => {
    if (gameState.balance < CHICKEN_PRICE) {
      toast.error('Недостаточно TON! Пополните кошелёк');
      return;
    }

    setGameState(prev => ({
      ...prev,
      chickens: prev.chickens + 1,
      balance: prev.balance - CHICKEN_PRICE,
      lastCollect: prev.chickens === 0 ? Date.now() : prev.lastCollect,
    }));
    toast.success('Курица куплена!');
  };

  const sellEggs = () => {
    if (gameState.eggs < 1) {
      toast.error('У вас недостаточно яиц для продажи');
      return;
    }

    const tonAmount = gameState.eggs * 0.1;
    setGameState(prev => ({
      ...prev,
      eggs: 0,
      balance: prev.balance + tonAmount,
    }));
    toast.success(`Продано яиц за ${tonAmount.toFixed(2)} TON!`);
  };

  const hatchEggs = () => {
    const eggsNeeded = 10;
    if (gameState.eggs < eggsNeeded) {
      toast.error(`Нужно ${eggsNeeded} яиц для вывода курицы`);
      return;
    }

    setGameState(prev => ({
      ...prev,
      eggs: prev.eggs - eggsNeeded,
      chickens: prev.chickens + 1,
    }));
    toast.success('Из яиц вылупилась новая курица!');
  };

  const copyWalletAddress = () => {
    const address = 'UQC2xEjVwozC1qw-VKV4cx5c1LmqAVfIJadhTxdc98pEZfqZ';
    navigator.clipboard.writeText(address);
    toast.success('Адрес кошелька скопирован!');
  };

  const eggPerHour = gameState.chickens * (EGG_PRODUCTION_RATE * 60);

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-300"
        style={{
          backgroundImage: 'url(https://cdn.poehali.dev/files/cad2dc70-dd34-40b0-ac80-8d35d496c4cb.jpeg)',
          filter: activeTab !== 'farm' ? 'blur(8px)' : 'blur(0px)',
        }}
      />
      
      <div className="absolute inset-0 bg-gradient-to-b from-orange-500/20 via-yellow-400/10 to-green-400/20" />

      <div className="relative z-10 flex flex-col h-screen max-h-screen">
        <header className="px-4 pt-6 pb-4">
          <h1 className="text-4xl text-white drop-shadow-lg text-center animate-bounce">
            🐔 Курятник
          </h1>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-20">
          {activeTab === 'farm' && (
            <div className="space-y-4 animate-fade-in">
              <Card className="bg-white/90 backdrop-blur-sm p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="text-5xl">🐔</div>
                    <div>
                      <p className="text-sm text-muted-foreground">Куриц</p>
                      <p className="text-3xl font-bold text-primary">{gameState.chickens}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Производство</p>
                    <p className="text-xl font-semibold text-accent">{eggPerHour.toFixed(2)}/ч</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-5xl animate-pulse">🥚</div>
                    <div>
                      <p className="text-sm text-muted-foreground">Яиц</p>
                      <p className="text-3xl font-bold text-primary">{gameState.eggs.toFixed(2)}</p>
                    </div>
                  </div>
                  {gameState.chickens > 0 && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Сбор через</p>
                      <p className="text-xl font-semibold text-orange-500">
                        {timeUntilCollect > 0 ? formatTime(timeUntilCollect) : 'Готово!'}
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              <Button 
                onClick={collectEggs}
                className="w-full h-16 text-xl font-bold shadow-lg hover:scale-105 transition-transform"
                disabled={gameState.chickens === 0 || timeUntilCollect > 0}
              >
                <Icon name="Egg" className="mr-2" size={24} />
                Собрать яйца
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={sellEggs}
                  variant="secondary"
                  className="h-14 font-semibold shadow-md hover:scale-105 transition-transform"
                  disabled={gameState.eggs < 1}
                >
                  <Icon name="DollarSign" className="mr-2" size={20} />
                  Продать яйца
                </Button>
                <Button 
                  onClick={hatchEggs}
                  variant="outline"
                  className="h-14 font-semibold shadow-md hover:scale-105 transition-transform border-2"
                  disabled={gameState.eggs < 10}
                >
                  <Icon name="Plus" className="mr-2" size={20} />
                  Вывести курицу (10🥚)
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'shop' && (
            <div className="space-y-4 animate-fade-in">
              <Card className="bg-white/95 backdrop-blur-md p-6 shadow-2xl">
                <h2 className="text-2xl mb-4 text-center">Магазин кур</h2>
                <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-6xl">🐔</div>
                    <div>
                      <p className="text-lg font-bold">Курица</p>
                      <p className="text-sm text-muted-foreground">+{(EGG_PRODUCTION_RATE * 60).toFixed(3)} яиц/ч</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{CHICKEN_PRICE} TON</p>
                  </div>
                </div>
                <Button 
                  onClick={buyChicken}
                  className="w-full h-14 text-lg font-bold shadow-lg hover:scale-105 transition-transform"
                  disabled={gameState.balance < CHICKEN_PRICE}
                >
                  <Icon name="ShoppingCart" className="mr-2" size={20} />
                  Купить курицу
                </Button>
              </Card>
            </div>
          )}

          {activeTab === 'wallet' && (
            <div className="space-y-4 animate-fade-in">
              <Card className="bg-white/95 backdrop-blur-md p-6 shadow-2xl">
                <h2 className="text-2xl mb-4 text-center">Кошелёк</h2>
                <div className="text-center mb-6">
                  <p className="text-sm text-muted-foreground mb-2">Ваш баланс</p>
                  <p className="text-5xl font-bold text-primary">{gameState.balance.toFixed(2)} TON</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-secondary/50 p-4 rounded-xl">
                    <p className="text-sm text-muted-foreground mb-2">Адрес для пополнения:</p>
                    <div className="bg-white p-3 rounded-lg break-all text-xs font-mono mb-3">
                      UQC2xEjVwozC1qw-VKV4cx5c1LmqAVfIJadhTxdc98pEZfqZ
                    </div>
                    <Button 
                      onClick={copyWalletAddress}
                      variant="outline"
                      className="w-full"
                    >
                      <Icon name="Copy" className="mr-2" size={16} />
                      Скопировать адрес
                    </Button>
                  </div>

                  <div className="bg-accent/10 p-4 rounded-xl border-2 border-accent/30">
                    <p className="text-sm font-semibold mb-2">Ваш MEMO:</p>
                    <div className="bg-white p-3 rounded-lg text-center">
                      <p className="text-xl font-mono font-bold text-accent">{gameState.userId}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Укажите этот MEMO при переводе для автоматического пополнения
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t-2 border-border shadow-2xl">
          <div className="grid grid-cols-3 gap-1 p-2">
            <Button
              variant={activeTab === 'farm' ? 'default' : 'ghost'}
              className="h-16 flex flex-col gap-1 hover:scale-105 transition-transform"
              onClick={() => setActiveTab('farm')}
            >
              <Icon name="Home" size={24} />
              <span className="text-xs">Ферма</span>
            </Button>
            <Button
              variant={activeTab === 'shop' ? 'default' : 'ghost'}
              className="h-16 flex flex-col gap-1 hover:scale-105 transition-transform"
              onClick={() => setActiveTab('shop')}
            >
              <Icon name="ShoppingBag" size={24} />
              <span className="text-xs">Магазин</span>
            </Button>
            <Button
              variant={activeTab === 'wallet' ? 'default' : 'ghost'}
              className="h-16 flex flex-col gap-1 hover:scale-105 transition-transform"
              onClick={() => setActiveTab('wallet')}
            >
              <Icon name="Wallet" size={24} />
              <span className="text-xs">Кошелёк</span>
            </Button>
          </div>
        </nav>
      </div>
    </div>
  );
}
