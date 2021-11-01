const DAPP_ADDRESS = "0x594839A20e84dD2E470600C45518Ec490133f3E8"; //insert the address I deployed to

const USDC_ADDRESS = "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d"

const BTCB_ADDRESS = "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c";
const WETH_ADDRESS = "0x2170ed0880ac9a755fd29b2688956bd959f933f8";
const BNB_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const ADA_ADDRESS = "0x3ee2200efb3400fabb9aacf31297cbdd1d435d47";
const XRP_ADDRESS = "0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe";
// const SOL_ADDRESS = "0x570a5d26f7765ecb712c0924e4de545b89fd43df"; //not enough liquidity on bsc currently
const DOT_ADDRESS = "0x7083609fce4d1d8dc0c979aab8c869ea2c873402";
const DOGE_ADDRESS = "0xba2ae424d960c26247dd6c32edc70b295c744c43";
const UNI_ADDRESS = "0xbf5140a22578168fd562dccf235e5d43a02ce9b1";
// const LUNA_ADDRESS = "0xeccf35f941ab67ffcaa9a1265c2ff88865caa005"; //no oracle for luna on bsc currently
const LTC_ADDRESS = "0x4338665cbb7b2485a8855a139b75d5e34ab0db94"; 
const LINK_ADDRESS = "0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD";

const BTC_USD_ORACLE = "0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf"
const ETH_USD_ORACLE = "0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e"
const BNB_USD_ORACLE = "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE"
const ADA_USD_ORACLE = "0xa767f745331D267c7751297D982b050c93985627"
const XRP_USD_ORACLE = "0x93A67D414896A280bF8FFB3b389fE3686E014fda"
// const SOL_USD_ORACLE = "0x0E8a53DD9c13589df6382F13dA6B3Ec8F919B323"
const DOT_USD_ORACLE = "0xC333eb0086309a16aa7c8308DfD32c8BBA0a2592"
const DOGE_USD_ORACLE = "0x3AB0A0d137D4F946fBB19eecc6e92E64660231C8"
const UNI_USD_ORACLE = "0xb57f259E7C24e56a1dA00F66b55A5640d9f9E7e4"
const LTC_USD_ORACLE = "0x74E72F37A8c415c8f1a98Ed42E78Ff997435791D"
const LINK_USD_ORACLE = "0xca236E327F629f9Fc2c30A4E95775EbF0B89fac8";

const TOTAL_MKT_CAP_ORACLE = "0xA7dd120a00aCf4161FdA187b864b73bdc8283D77"
// const QUICKSWAP_ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff"
const SUSHISWAP_ROUTER = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"

var user;

const provider = new ethers.providers.Web3Provider(window.ethereum)
const signer = provider.getSigner()

const dappContract_signer = new ethers.Contract(DAPP_ADDRESS, cryptoIndexBinance_abi, signer);
const dappContract_provider = new ethers.Contract(DAPP_ADDRESS, cryptoIndexBinance_abi, provider);

/*****************************************/
/* Detect the MetaMask Ethereum provider */
/*****************************************/

//check that we are connected to Binance network
var chainId = await checkNetworkId(provider)
if (chainId !== 56) {
  console.log("Please change to Binance network") //TODO make this an alert to the user...
  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x38' }], //56 in 0x padded hexadecimal form is 0x38
    });
    window.location.reload();
  } catch (switchError) {
    // This error code indicates that the chain has not been added to MetaMask.
    if (error.code === 4902) {
      try {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{ chainId: '0x38', rpcUrl: 'https://bsc-dataseed1.binance.org' /* ... */ }],
        });
      } catch (addError) {
        // handle "add" error
      }
    }
    // handle other "switch" errors
  }
}

if (provider) {
  startApp(provider); // Initialize your app
} else {
  console.log('Please install MetaMask!');
}

async function checkNetworkId(_provider) {
  try {
    var network = await provider.getNetwork();
    return network["chainId"];
  }
  catch (error) {
    console.log(error);
  }
}

async function startApp(provider) {
  const depositButton = document.getElementById('depositButton');
  const approveButton = document.getElementById('approveButton');

  const withdrawToUserButton = document.getElementById('withdraw_BB_to_user');

  const accounts = await ethereum.request({ method: 'eth_accounts' });
  user = accounts[0];

  await displayBalances();

  await displayUSDBalances();

  approveButton.addEventListener('click', async () => {
    var depositAmountUSDC = $("#depositAmountUSDC").val(); //put in some checks here? positive number, between x and y, user has enough funds...
    await giveApprovalFromUser(USDC_ADDRESS, DAPP_ADDRESS, ethers.utils.parseUnits(depositAmountUSDC.toString(), 18));
  })

  depositButton.addEventListener('click', async () => {
    var depositAmountUSDC = $("#depositAmountUSDC").val(); //put in some checks here? positive number, between x and y, user has enough funds...
    console.log(`Depositing ${depositAmountUSDC} of USDC to the SushiIndex account`);
    $("#swapStarted").css("display", "block");
    $("#swapStarted").text(`Depositing ${depositAmountUSDC} of USDC to the Binance Index account`);
    // var array_coins = await getTokenInfo(DAPP_ADDRESS);
    var token_addresses = [BTCB_ADDRESS, WETH_ADDRESS, BNB_ADDRESS, ADA_ADDRESS, XRP_ADDRESS, DOT_ADDRESS, DOGE_ADDRESS, UNI_ADDRESS, LTC_ADDRESS, LINK_ADDRESS];

    await dappContract_signer.depositUserFunds(
      ethers.utils.parseUnits(depositAmountUSDC.toString(), 18),
      USDC_ADDRESS,
      user,
      token_addresses)
  })

  withdrawToUserButton.addEventListener('click', async () => {
    var token_addresses = [BTCB_ADDRESS, WETH_ADDRESS, BNB_ADDRESS, ADA_ADDRESS, XRP_ADDRESS, DOT_ADDRESS, DOGE_ADDRESS, UNI_ADDRESS, LTC_ADDRESS, LINK_ADDRESS];
    //put in gas estimation here
    await dappContract_signer.withdrawUserFunds(user, token_addresses);
  })
}

async function displayBalances() {
  getETHResult.innerHTML = parseFloat(ethers.utils.formatUnits(await getBalance(WETH_ADDRESS, DAPP_ADDRESS), 18)).toFixed(6) || 'Not able to get accounts';

  getBTCResult.innerHTML = parseFloat(ethers.utils.formatUnits(await getBalance(BTCB_ADDRESS, DAPP_ADDRESS), 18)).toFixed(6) || 'Not able to get accounts';

  getBNBResult.innerHTML = parseFloat(ethers.utils.formatUnits(await getBalance(BNB_ADDRESS, DAPP_ADDRESS), 18)).toFixed(6) || 'Not able to get accounts';

  getADAResult.innerHTML = parseFloat(ethers.utils.formatUnits(await getBalance(ADA_ADDRESS, DAPP_ADDRESS), 18)).toFixed(6) || 'Not able to get accounts';

  getXRPResult.innerHTML = parseFloat(ethers.utils.formatUnits(await getBalance(XRP_ADDRESS, DAPP_ADDRESS), 18)).toFixed(6) || 'Not able to get accounts';

  getLINKResult.innerHTML = parseFloat(ethers.utils.formatUnits(await getBalance(LINK_ADDRESS, DAPP_ADDRESS), 18)).toFixed(6) || 'Not able to get accounts';

  getDOTResult.innerHTML = parseFloat(ethers.utils.formatUnits(await getBalance(DOT_ADDRESS, DAPP_ADDRESS), 18)).toFixed(6) || 'Not able to get accounts';

  getDOGEResult.innerHTML = parseFloat(ethers.utils.formatUnits(await getBalance(DOGE_ADDRESS, DAPP_ADDRESS), 8)).toFixed(6) || 'Not able to get accounts';

  getUNIResult.innerHTML = parseFloat(ethers.utils.formatUnits(await getBalance(UNI_ADDRESS, DAPP_ADDRESS), 18)).toFixed(6) || 'Not able to get accounts';

  getLTCResult.innerHTML = parseFloat(ethers.utils.formatUnits(await getBalance(LTC_ADDRESS, DAPP_ADDRESS), 18)).toFixed(6) || 'Not able to get accounts';
}

async function displayUSDBalances() {
  var array_coins = await getTokenInfo(DAPP_ADDRESS);
  
  var btcb_usd = array_coins[0].usd_balance;
  BTCInUsd.innerHTML = btcb_usd.toFixed(2) || 'Not able to get accounts'; //8 decimals for oracle input, 18 for WMATIC
  var weth_usd = array_coins[1].usd_balance;
  ETHInUsd.innerHTML = weth_usd.toFixed(2) || 'Not able to get accounts';
  var bnb_usd = array_coins[2].usd_balance;
  BNBInUsd.innerHTML = bnb_usd.toFixed(2) || 'Not able to get accounts';
  var ada_usd = array_coins[3].usd_balance;
  ADAInUsd.innerHTML = ada_usd.toFixed(2) || 'Not able to get accounts';
  var xrp_usd = array_coins[4].usd_balance;
  XRPInUsd.innerHTML = xrp_usd.toFixed(2) || 'Not able to get accounts'; //8 decimals for oracle input, 18 for WMATIC
  var link_usd = array_coins[5].usd_balance;
  LINKInUsd.innerHTML = link_usd.toFixed(2) || 'Not able to get accounts';
  var dot_usd = array_coins[6].usd_balance;
  DOTInUsd.innerHTML = dot_usd.toFixed(2) || 'Not able to get accounts';
  var doge_usd = array_coins[7].usd_balance;
  DOGEInUsd.innerHTML = doge_usd.toFixed(2) || 'Not able to get accounts';
  var uni_usd = array_coins[8].usd_balance;
  UNIInUsd.innerHTML = uni_usd.toFixed(2) || 'Not able to get accounts'; //8 decimals for oracle input, 18 for WMATIC
  var ltc_usd = array_coins[9].usd_balance;
  LTCInUsd.innerHTML = ltc_usd.toFixed(2) || 'Not able to get accounts';

  var total_in_usd = btcb_usd + weth_usd + bnb_usd + ada_usd + xrp_usd + link_usd + dot_usd + doge_usd + uni_usd + ltc_usd;
  TotalInUSD.innerHTML = '$ ' + total_in_usd.toFixed(2);

  var userShares = (await dappContract_provider.getUserShares(user)).toNumber()
  var totalShares = (await dappContract_provider.totalNumberOfShares()).toNumber() //lesson here - overwriting public variable getter function??
  UserShareInPerc.innerHTML = (userShares / totalShares * 100).toFixed(1) + '%'; //can add a percentage thingie here!
  USERshareInUSD.innerHTML = '$ ' + (userShares / totalShares * total_in_usd).toFixed(2); //TODO - neaten up this fix
}

async function getTokenInfo(accountOrContract) {

  function Coin(address, oracleAddress, decimals, balance, usd_balance, diff_from_average, usd_exchange_rate) { //in JS we create an object type by using a constructor function
    this.address = address;
    this.oracleAddress = oracleAddress;
    this.decimals = decimals;
    this.balance = balance;
    this.usd_balance = usd_balance;
    this.diff_from_average = diff_from_average;
    this.usd_exchange_rate = usd_exchange_rate;
  }

  //create a coin object for each of our 4 assets
  var tokenList = [BTCB_ADDRESS, WETH_ADDRESS, BNB_ADDRESS, ADA_ADDRESS, XRP_ADDRESS, DOT_ADDRESS, DOGE_ADDRESS, UNI_ADDRESS, LTC_ADDRESS, LINK_ADDRESS];
  var array_coins = [];
  var i=0;
  for (var tokenAddress of tokenList) {
    array_coins[i] = new Coin(tokenAddress);
    i++;
  }
  console.log(array_coins[0]);
  // var BTCB = new Coin("BTCB", BTCB_ADDRESS, BTC_USD_ORACLE);
  // var WETH = new Coin("WETH", WETH_ADDRESS, ETH_USD_ORACLE);
  // var BNB = new Coin("BNB", BNB_ADDRESS, BNB_USD_ORACLE);
  // var ADA = new Coin("ADA", ADA_ADDRESS, ADA_USD_ORACLE);
  // var XRP = new Coin("XRP", XRP_ADDRESS, XRP_USD_ORACLE);
  // var LINK = new Coin("LINK", LINK_ADDRESS, LINK_USD_ORACLE);
  // var DOT = new Coin("DOT", DOT_ADDRESS, DOT_USD_ORACLE);
  // var DOGE = new Coin("DOGE", DOGE_ADDRESS, DOGE_USD_ORACLE);
  // var UNI = new Coin("UNI", UNI_ADDRESS, UNI_USD_ORACLE);
  // var LTC = new Coin("LTC", LTC_ADDRESS, LTC_USD_ORACLE);

  // var array_coins = [BTCB, WETH, BNB, ADA, XRP, LINK, DOT, DOGE, UNI, LTC];
  var total_in_usd = 0;

  for (let coin of array_coins) {
    console.log(coin.address);
    coin.balance = await getBalance(coin.address, accountOrContract);
    coin.oracleAddress = await getOracle(coin.address);
    coin.usd_exchange_rate = await getExchangeRate(coin.oracleAddress);
    coin.decimals = await getDecimals(coin.address);
    coin.usd_balance = parseFloat(
      (parseFloat(
        ethers.utils.formatUnits(coin.balance, coin.decimals))
        * parseFloat(ethers.utils.formatUnits(coin.usd_exchange_rate, 8)
        ))
        .toFixed(6)
    );
    total_in_usd += coin.usd_balance;
  }

  var no_of_assets = array_coins.length;
  var target_per_asset = total_in_usd / no_of_assets;
  for (let coin of array_coins) {
    coin.diff_from_average = coin.usd_balance - target_per_asset;
  }
  console.log(array_coins);
  return array_coins;
}

async function giveApprovalFromUser(token_address, router_address, amountIn) {
  // create a new instance of a contract
  var tokenContract = new ethers.Contract(token_address, token_abi, signer)
  // give router_address approval to spend user's tokens
  try {
    var approved = await tokenContract.approve(router_address, amountIn); //approve(spender, amount)
    return approved;

  } catch (error) {
    console.log(error)
  }
}

async function getBalance(token_address, accountOrContract) {
  var tokenContract = new ethers.Contract(token_address, token_abi, provider)
  try {
    var token_balance = await tokenContract.balanceOf(accountOrContract);//need to catch an error here - perhaps make this it's own function!
    return token_balance;
  } catch (error) {
    console.log(error)
  }
}


async function getExchangeRate(oracle_address) {
  var oracle = new ethers.Contract(oracle_address, CHAINLINK_ORACLE_ABI, provider);
  try {
    var exchangeRate = await oracle.latestAnswer();
    return exchangeRate; //returns in BigNumber format
  } catch (error) {
    console.log(error);
  }
}

async function getDecimals(token_address) {
  var tokenContract = new ethers.Contract(token_address, token_abi, provider)
  // check how many decimals that token has
  try {
    var decimals = await tokenContract.decimals();//need to catch an error here - perhaps make this it's own function!
    return decimals;
  } catch (error) {
    console.log(error);
  }
}

async function getOracle(token_address) {
  try {
    var oracleAddress = await dappContract_signer.oracle_addresses(token_address); //approve(spender, amount)
    return oracleAddress;

  } catch (error) {
    console.log(error)
  }
}



