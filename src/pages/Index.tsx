import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

type Tab = 'farm' | 'shop' | 'wallet' | 'market';

interface MarketOrder {
  id: number;
  userId: string;
  eggsAmount: number;
  pricePerEgg: number;
  totalPrice: number;
  createdAt: string;
}

interface GameState {
  chickens: number;
  eggs: number;
  balance: number;
  lastCollect: number;
  userId: string;
}

const CHICKEN_PRICE = 1;
const CHICKENS_PER_TON = 3000;
const EGG_PRODUCTION_RATE = 0.014;
const COLLECT_INTERVAL = 3600000;
const EGGS_FOR_HATCH = 100;

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
  const [marketOrders, setMarketOrders] = useState<MarketOrder[]>([]);
  const [sellPrice, setSellPrice] = useState(0.01);
  const MARKETPLACE_URL = 'https://functions.poehali.dev/00dcf964-93e1-4b2b-bde4-9d382e43cba0';

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
    if (activeTab === 'market') {
      fetchMarketOrders();
    }
  }, [activeTab]);

  const fetchMarketOrders = async () => {
    try {
      const response = await fetch(`${MARKETPLACE_URL}?action=list`);
      const data = await response.json();
      setMarketOrders(data.orders || []);
    } catch (error) {
      console.error('Error fetching market orders:', error);
    }
  };

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

    const eggsProduced = gameState.chickens * EGG_PRODUCTION_RATE;
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
      chickens: prev.chickens + CHICKENS_PER_TON,
      balance: prev.balance - CHICKEN_PRICE,
      lastCollect: prev.chickens === 0 ? Date.now() : prev.lastCollect,
    }));
    toast.success(`Куплено ${CHICKENS_PER_TON} кур!`);
  };

  const sellEggs = async () => {
    if (gameState.eggs < EGGS_FOR_HATCH) {
      toast.error(`Минимум ${EGGS_FOR_HATCH} яиц для продажи`);
      return;
    }

    try {
      const response = await fetch(MARKETPLACE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          userId: gameState.userId,
          eggsAmount: gameState.eggs,
          pricePerEgg: sellPrice,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setGameState(prev => ({
          ...prev,
          eggs: 0,
        }));
        toast.success(`${gameState.eggs.toFixed(2)} яиц выставлено на продажу!`);
        if (activeTab === 'market') {
          fetchMarketOrders();
        }
      } else {
        toast.error('Ошибка при создании заказа');
      }
    } catch (error) {
      toast.error('Ошибка соединения с рынком');
    }
  };

  const buyEggs = async (orderId: number, totalPrice: number, eggsAmount: number) => {
    if (gameState.balance < totalPrice) {
      toast.error('Недостаточно TON!');
      return;
    }

    try {
      const response = await fetch(MARKETPLACE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'buy',
          orderId,
          buyerId: gameState.userId,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setGameState(prev => ({
          ...prev,
          eggs: prev.eggs + eggsAmount,
          balance: prev.balance - totalPrice,
        }));
        toast.success(`Куплено ${eggsAmount} яиц!`);
        fetchMarketOrders();
      } else {
        toast.error(data.error || 'Ошибка при покупке');
      }
    } catch (error) {
      toast.error('Ошибка соединения с рынком');
    }
  };

  const hatchEggs = () => {
    if (gameState.eggs < EGGS_FOR_HATCH) {
      toast.error(`Нужно ${EGGS_FOR_HATCH} яиц для вывода курицы`);
      return;
    }

    setGameState(prev => ({
      ...prev,
      eggs: prev.eggs - EGGS_FOR_HATCH,
      chickens: prev.chickens + 1,
    }));
    toast.success('Из яиц вылупилась новая курица!');
  };

  const copyWalletAddress = () => {
    const address = 'UQC2xEjVwozC1qw-VKV4cx5c1LmqAVfIJadhTxdc98pEZfqZ';
    navigator.clipboard.writeText(address);
    toast.success('Адрес кошелька скопирован!');
  };

  const eggPerHour = gameState.chickens * EGG_PRODUCTION_RATE;

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
                  onClick={() => setActiveTab('market')}
                  variant="secondary"
                  className="h-14 font-semibold shadow-md hover:scale-105 transition-transform"
                  disabled={gameState.eggs < EGGS_FOR_HATCH}
                >
                  <Icon name="ShoppingBag" className="mr-2" size={20} />
                  Продать на рынке
                </Button>
                <Button 
                  onClick={hatchEggs}
                  variant="outline"
                  className="h-14 font-semibold shadow-md hover:scale-105 transition-transform border-2"
                  disabled={gameState.eggs < EGGS_FOR_HATCH}
                >
                  <Icon name="Plus" className="mr-2" size={20} />
                  Вывести курицу ({EGGS_FOR_HATCH}🥚)
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
                      <p className="text-lg font-bold">Пакет кур</p>
                      <p className="text-sm text-muted-foreground">{CHICKENS_PER_TON} кур × {EGG_PRODUCTION_RATE} яиц/ч</p>
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
                  Купить {CHICKENS_PER_TON} кур
                </Button>
              </Card>
            </div>
          )}

          {activeTab === 'market' && (
            <div className="space-y-4 animate-fade-in">
              <Card className="bg-white/95 backdrop-blur-md p-6 shadow-2xl">
                <h2 className="text-2xl mb-4 text-center">Рынок яиц</h2>
                
                {gameState.eggs >= EGGS_FOR_HATCH && (
                  <div className="mb-6 p-4 bg-secondary/50 rounded-xl">
                    <p className="text-sm font-semibold mb-2">Продать свои яйца:</p>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="number"
                        value={sellPrice}
                        onChange={(e) => setSellPrice(parseFloat(e.target.value))}
                        step="0.001"
                        min="0.001"
                        className="flex-1 px-3 py-2 rounded-lg border-2 border-border"
                        placeholder="Цена за 1 яйцо"
                      />
                      <span className="flex items-center px-3 bg-white rounded-lg font-mono">
                        {(gameState.eggs * sellPrice).toFixed(3)} TON
                      </span>
                    </div>
                    <Button 
                      onClick={sellEggs}
                      className="w-full"
                    >
                      Выставить {gameState.eggs.toFixed(2)} яиц
                    </Button>
                  </div>
                )}

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {marketOrders.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Пока нет предложений</p>
                  ) : (
                    marketOrders.map((order) => (
                      <div key={order.id} className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border-2 border-orange-200">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <p className="text-sm text-muted-foreground">Продавец: {order.userId.substring(0, 12)}...</p>
                            <p className="text-2xl font-bold">{order.eggsAmount} 🥚</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">{order.pricePerEgg.toFixed(4)} TON/шт</p>
                            <p className="text-xl font-bold text-primary">{order.totalPrice.toFixed(3)} TON</p>
                          </div>
                        </div>
                        {order.userId !== gameState.userId && (
                          <Button
                            onClick={() => buyEggs(order.id, order.totalPrice, order.eggsAmount)}
                            className="w-full mt-2"
                            size="sm"
                            disabled={gameState.balance < order.totalPrice}
                          >
                            <Icon name="ShoppingCart" className="mr-2" size={16} />
                            Купить
                          </Button>
                        )}
                        {order.userId === gameState.userId && (
                          <p className="text-center text-sm text-muted-foreground mt-2">Ваше предложение</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
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
          <div className="grid grid-cols-4 gap-1 p-2">
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
              <Icon name="Store" size={24} />
              <span className="text-xs">Куры</span>
            </Button>
            <Button
              variant={activeTab === 'market' ? 'default' : 'ghost'}
              className="h-16 flex flex-col gap-1 hover:scale-105 transition-transform"
              onClick={() => setActiveTab('market')}
            >
              <Icon name="ShoppingBag" size={24} />
              <span className="text-xs">Рынок</span>
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