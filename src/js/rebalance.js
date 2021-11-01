const DAPP_ADDRESS = "0x594839A20e84dD2E470600C45518Ec490133f3E8"; //insert the address I deployed to

const USDC_ADDRESS = "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d"

const BTCB_ADDRESS = "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c";
const WETH_ADDRESS = "0x2170ed0880ac9a755fd29b2688956bd959f933f8";
const BNB_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const ADA_ADDRESS = "0x3ee2200efb3400fabb9aacf31297cbdd1d435d47";
const XRP_ADDRESS = "0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe";
//const SOL_ADDRESS = "0x570a5d26f7765ecb712c0924e4de545b89fd43df";
const DOT_ADDRESS = "0x7083609fce4d1d8dc0c979aab8c869ea2c873402";
const DOGE_ADDRESS = "0xba2ae424d960c26247dd6c32edc70b295c744c43";
const UNI_ADDRESS = "0xbf5140a22578168fd562dccf235e5d43a02ce9b1";
// const LUNA_ADDRESS = "0xeccf35f941ab67ffcaa9a1265c2ff88865caa005"; //doesn't seem to have an oracle currently?
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

const dappContract_signer = new ethers.Contract(DAPP_ADDRESS, sushi_index_abi, signer);

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
  //Basic Actions Section
  const rebalanceOneButton = document.getElementById('rebalance_1');

  const accounts = await ethereum.request({ method: 'eth_accounts' });
  user = accounts[0];

  rebalanceOneButton.addEventListener('click', async () => {
    var array_coins = await getTokenInfoViaTokenContract();

    sortCoinsDescendingByDiffFromAvg(array_coins);
    //might this bit be partly easier to implement in solidity - it will wait better?
    await balanceAndRemoveOneCoin(array_coins);
  })
}

async function balanceAndRemoveOneCoin(array_coins) {
  var swapCounter = 0;
  var tokens_to_be_swapped_addresses = [];
  var tokens_swapping_to_addresses = [];
  var amounts_to_be_swapped = [];

  do {
    var swapInputs = getSwapInputs(array_coins);
    tokens_to_be_swapped_addresses[swapCounter] = swapInputs[2][0];
    tokens_swapping_to_addresses[swapCounter] = swapInputs[2][1];
    amounts_to_be_swapped[swapCounter] = swapInputs[0];

    updateArray(array_coins);
    swapCounter++;
  } while (array_coins.length > 1)

  await dappContract_signer.executeNSwaps(tokens_to_be_swapped_addresses, tokens_swapping_to_addresses, amounts_to_be_swapped);
}

function sortCoinsDescendingByDiffFromAvg(_array_coins) {
  _array_coins.sort((a, b) => {
    return b.diff_from_average - a.diff_from_average;
  });
}

async function checkIfApprovedForAmount(_token_address, _amount) {
  var approvedAmount = await getAllowance(_token_address, SUSHISWAP_ROUTER) //input token and router addresses
  if (approvedAmount.lt(_amount)) return false;
  else return true;
}

async function getAllowance(token_address, router_address) {
  // create a new instance of a contract
  var tokenContract = new ethers.Contract(token_address, token_abi, signer)
  // check what amount of user's tokens the spender is approved to use
  try {
    var approvedAmount = await tokenContract.allowance(DAPP_ADDRESS, router_address); //allowance(owner_address, spender_address)
    return approvedAmount;
  } catch (error) {
    console.log(error)
  }
}

function getSwapInputs(array_coins) {
  if (array_coins[0].diff_from_average > Math.abs(array_coins[array_coins.length - 1].diff_from_average)) { //check which coin is further from the dollar average

    var swap_path = [array_coins[0].address, array_coins[array_coins.length - 1].address] //swap from first array item to last

    var amountIn = Math.abs(array_coins[array_coins.length - 1].diff_from_average) * (1 / (array_coins[0].usd_exchange_rate)) //figure out how much to swap
    var amountOutMin = Math.abs(array_coins[array_coins.length - 1].diff_from_average) * (1 / (array_coins[array_coins.length - 1].usd_exchange_rate)) * 0.75;

    var amountIn_Wei = parseInt(amountIn * 10 ** array_coins[0].decimals).toString() //am I introducing potential rounding errors here? And should I check for NaN after?
    var amountOutMin_Wei = parseInt(amountOutMin * 10 ** array_coins[array_coins.length - 1].decimals).toString()

    console.log(`Swapping ${amountIn.toFixed(8)} of ${array_coins[0].symbol} for ${array_coins[array_coins.length - 1].symbol}`);
    // $("#swapStarted").css("display", "block");
    // $("#swapStarted").text(`Swapping ${amountIn.toFixed(8)} of ${array_coins[0].symbol} for ${array_coins[array_coins.length - 1].symbol}`);

    return [amountIn_Wei, amountOutMin_Wei, swap_path];
  }
  else {

    var swap_path = [array_coins[0].address, array_coins[array_coins.length - 1].address]; // swap from last array item to first

    var amountIn = Math.abs(array_coins[0].diff_from_average) * (1 / (array_coins[0].usd_exchange_rate)); //figure out how much to swap
    var amountOutMin = Math.abs(array_coins[0].diff_from_average) * (1 / (array_coins[array_coins.length - 1].usd_exchange_rate)) * 0.75;
    var amountIn_Wei = parseInt(amountIn * 10 ** array_coins[0].decimals).toString() //am I introducing potential rounding errors here? And should I check for NaN after?
    var amountOutMin_Wei = parseInt(amountOutMin * 10 ** array_coins[array_coins.length - 1].decimals).toString()

    console.log(`Swapping ${amountIn.toFixed(8)} of ${array_coins[0].symbol} for ${array_coins[array_coins.length - 1].symbol}`);
    // $("#swapStarted").css("display", "block");
    // $("#swapStarted").text(`Swapping ${amountIn.toFixed(8)} of ${array_coins[0].symbol} for ${array_coins[array_coins.length - 1].symbol}`);

    return [amountIn_Wei, amountOutMin_Wei, swap_path];
  }
}

async function askUserForApproval(_token_address, _amount) {
  if (window.confirm("Time to get approval!")) {
    //ask for approval
    await giveApprovalFromDapp(_token_address, SUSHISWAP_ROUTER, _amount); //token_address, router_address, amountIn
  }
}

function updateArray(array_coins) {
  if (array_coins[0].diff_from_average > Math.abs(array_coins[array_coins.length - 1].diff_from_average)) { //check which coin is further from the dollar average
    decreaseFirstCoinDiffFromAverage(array_coins);
    removeFirstCoinAndReSort(array_coins);
  }
  else {
    decreaseLastCoinDiffFromAverage(array_coins)
    removeLastCoinAndReSort(array_coins);
  }
}

function decreaseFirstCoinDiffFromAverage(_array_coins) {
  _array_coins[0].diff_from_average -= Math.abs(_array_coins[_array_coins.length - 1].diff_from_average);
}

function decreaseLastCoinDiffFromAverage(_array_coins) {
  _array_coins[_array_coins.length - 1].diff_from_average += Math.abs(_array_coins[0].diff_from_average);
}

function removeFirstCoinAndReSort(_array_coins) {
  _array_coins.pop() //removes the last element from the array

  sortCoinsDescendingByDiffFromAvg(_array_coins);
}

function removeLastCoinAndReSort(_array_coins) {
  _array_coins.shift(); //remove the first element from the array

  sortCoinsDescendingByDiffFromAvg(_array_coins);
}

async function getBalance(token_address) {
  // create a new instance of a contract - in web3.js >1.0.0, will have to use "new web3.eth.Contract" (uppercase C)
  var tokenContract = new ethers.Contract(token_address, token_abi, signer)
  // get the balance of our user in that token
  try {
    var tokenBalance = await tokenContract.balanceOf(DAPP_ADDRESS);
    return tokenBalance; //I'm guessing this is a BN (or a string?)
  } catch (error) {
    console.log(error)
  }
}

async function getTokenInfoViaTokenContract() {

  function Coin(address, symbol, oracleAddress, decimals, balance, usd_balance, diff_from_average, usd_exchange_rate) { //in JS we create an object type by using a constructor function
    this.address = address;
    this.symbol = symbol;
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
  var total_in_usd = 0;

  for (let coin of array_coins) {
    coin.balance = await getBalance(coin.address);
    coin.oracleAddress = await getOracle(coin.address);
    coin.usd_exchange_rate = await getExchangeRate(coin.oracleAddress);
    coin.decimals = await getDecimals(coin.address);
    coin.usd_balance = parseFloat(ethers.utils.formatUnits(coin.balance, coin.decimals)) * coin.usd_exchange_rate;
    total_in_usd += coin.usd_balance;
  }

  var no_of_assets = array_coins.length;
  var target_per_asset = total_in_usd / no_of_assets;
  for (let coin of array_coins) {
    coin.diff_from_average = coin.usd_balance - target_per_asset;
  }
  return array_coins;
}

async function executeDappSwap(_amountIn, _amountOutMin, _path, _acct, _deadline) {
  console.log(`Swapping ${_amountIn} of ${_path[0]} into ${_path[1]}`);
  $("#swapStarted").css("display", "block");
  $("#swapStarted").text(`Swapping ${_amountIn} of ${_path[0]} into ${_path[1]}`);
  var estimatedGasLimit = await dappContract_signer.estimateGas.swap(_amountIn, _amountOutMin, _path, _acct, _deadline);
  try {
    await dappContract_signer.swap(_amountIn, _amountOutMin, _path, _acct, _deadline, { gasLimit: parseInt(estimatedGasLimit * 1.2) });
  }
  catch (error) {
    console.log(error); //can I get it to try again here??
  }
}

async function giveApprovalFromDapp(token_address, router_address, amountIn) {
  // give router_address approval to spend dapp's tokens
  try {
    var approved = await dappContract_signer.approve_spending(token_address, router_address, amountIn); //approve(spender, amount)
    return approved;

  } catch (error) {
    console.log(error)
  }
}

// async function getExchangeRate(oracle_address) {
//   const provider_testnet = new ethers.getDefaultProvider("https://api.s0.b.hmny.io");
//   const aggregatorV3InterfaceABI = [{ "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "description", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint80", "name": "_roundId", "type": "uint80" }], "name": "getRoundData", "outputs": [{ "internalType": "uint80", "name": "roundId", "type": "uint80" }, { "internalType": "int256", "name": "answer", "type": "int256" }, { "internalType": "uint256", "name": "startedAt", "type": "uint256" }, { "internalType": "uint256", "name": "updatedAt", "type": "uint256" }, { "internalType": "uint80", "name": "answeredInRound", "type": "uint80" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "latestRoundData", "outputs": [{ "internalType": "uint80", "name": "roundId", "type": "uint80" }, { "internalType": "int256", "name": "answer", "type": "int256" }, { "internalType": "uint256", "name": "startedAt", "type": "uint256" }, { "internalType": "uint256", "name": "updatedAt", "type": "uint256" }, { "internalType": "uint80", "name": "answeredInRound", "type": "uint80" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "version", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }];
//   const addr = oracle_address;
//   const priceFeed = new ethers.Contract(addr, aggregatorV3InterfaceABI, provider_testnet);

//   try {
//     var result = await priceFeed.latestRoundData();
//     console.log("Latest Round Data", result[1]);
//     return result[1]; //returns in BigNumber format
//   } catch (error) {
//     console.log(error);
//   }
// }

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
