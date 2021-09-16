pragma solidity ^0.6.12;

//import statements go here
import "./interfaces/IUniswapV2Router02.sol";
import "./interfaces/IUniswapV2Router01.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";

contract SushiIndex {
    using SafeMath for uint256;

    address public constant USDC_ADDRESS = 0x985458E523dB3d53125813eD68c274899e9DfAb4;
    
    address public constant WONE_ADDRESS = 0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a;
    address public constant SUSHI_ADDRESS = 0xBEC775Cb42AbFa4288dE81F387a9b1A3c4Bc552A;
    address public constant WETH_ADDRESS = 0x6983D1E6DEf3690C4d616b13597A09e6193EA013;
    address public constant WBTC_ADDRESS = 0x3095c7557bCb296ccc6e363DE01b760bA031F2d9;

    // address public constant ONE_USD_ORACLE = 0xcEe686F89bc0dABAd95AEAAC980aE1d97A075FAD;
    // address public constant WBTC_USD_ORACLE = 0xEF637736B220a58C661bfF4b71e03ca898DCC0Bd;
    // address public constant ETH_USD_ORACLE = 0x4f11696cE92D78165E1F8A9a4192444087a45b64;
    // address public constant SUSHI_USD_ORACLE = 0x90142a6930ecF80F1d14943224C56CFe0CD0d347;

    address[] public USDCToWONEPath = [USDC_ADDRESS, WONE_ADDRESS];
    address[] public USDCToSUSHIPath = [USDC_ADDRESS, WONE_ADDRESS, SUSHI_ADDRESS];
    address[] public USDCToWETHPath = [USDC_ADDRESS, WONE_ADDRESS, WETH_ADDRESS];
    address[] public USDCToWBTCPath = [USDC_ADDRESS, WONE_ADDRESS, WBTC_ADDRESS];

    address[] public WONEToUSDCPath = [WONE_ADDRESS, USDC_ADDRESS];
    address[] public SUSHIToUSDCPath = [SUSHI_ADDRESS, WONE_ADDRESS, USDC_ADDRESS];
    address[] public WETHToUSDCPath = [WETH_ADDRESS, WONE_ADDRESS, USDC_ADDRESS];
    address[] public WBTCToUSDCPath = [WBTC_ADDRESS, WONE_ADDRESS,USDC_ADDRESS];

    address public constant SUSHISWAP_ROUTER = 0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506;
    
    uint256 public totalNumberOfShares;
    mapping(address => uint256) public userNumberOfShares; 

    IUniswapV2Router02 public sushiSwapRouter = IUniswapV2Router02(SUSHISWAP_ROUTER);
    //more variables here
    // constructor() autoBalancer public {
    // } 
    
    /**
     * Returns the latest price
     */
    function getLatestPrice(address _oracle_address) public view returns (int) {
        (
            uint80 roundID, 
            int price,
            uint startedAt,
            uint timeStamp,
            uint80 answeredInRound
        ) = AggregatorV3Interface(_oracle_address).latestRoundData();
        return price;
    }

    function updateSharesOnWithdrawal(address user) public { //make this ownable - only contract itself can update this?
        require (userNumberOfShares[user] > 0, "Error - This user has no shares");
        totalNumberOfShares -= userNumberOfShares[user];
        userNumberOfShares[user] = 0;
    }

    function getUserShares(address user) public view returns (uint256 userShares) {
        return userNumberOfShares[user];
    }

    function approve_spending (address token_address, address spender_address, uint256 amount_to_approve) public {
            IERC20(token_address).approve(spender_address, amount_to_approve);
    }
    
     receive() external payable {
    }

    function deposit (uint256 _amount, address token_address, address address_from) public {
        IERC20 token_ = IERC20(token_address);

        token_.transferFrom(
            address_from, 
            address(this), 
            _amount
        );
    }

    function depositFirstTime (uint256 _amount, address token_address, address address_from) public {
        deposit(_amount, token_address, address_from);

        approve_spending(USDC_ADDRESS, SUSHISWAP_ROUTER, _amount);

        swapIntoFourEqualParts(_amount);

        setSharesFirstTime(address_from);
    }

    function depositUserFunds (uint256 amount_, address token_address, address address_from, uint256 WONE_balanceInUSD, uint256 SUSHI_balanceInUSD, uint256 WETH_balanceInUSD, uint256 WBTC_balanceInUSD) public  {
        // TO DO - replace with deposit(amount_, token_address, address_from);
        IERC20 token_ = IERC20(token_address);

        token_.transferFrom(
            address_from, 
            address(this), 
            amount_
        );

        approve_spending(USDC_ADDRESS, SUSHISWAP_ROUTER, amount_);

        uint256 Total_in_USD = WONE_balanceInUSD.add(SUSHI_balanceInUSD).add(WETH_balanceInUSD).add(WBTC_balanceInUSD);
        
        if (Total_in_USD > 0) {
            swapProportionately(WONE_balanceInUSD, SUSHI_balanceInUSD, WETH_balanceInUSD, WBTC_balanceInUSD, Total_in_USD, amount_);
            updateSharesOnDeposit(address_from, Total_in_USD, amount_);
        } else {
            swapIntoFourEqualParts(amount_);
            setSharesFirstTime(address_from);
        }
    }

    function getUSDBalanceOf(address token_address, address oracle_address, uint256 token_decimals) public view returns (uint256) {
        // uint256 token_decimals = IERC20(token_address).decimals();
        return balanceOf(token_address, address(this))
        .mul(uint256(getLatestPrice(oracle_address)))
        .div(10**(token_decimals+2));
    }

    function swapProportionately(uint256 WONE_amount, uint256 SUSHI_amount, uint256 WETH_amount, uint256 WBTC_amount, uint256 totalUSDAmount, uint256 depositAmount) public {
        uint256 WONE_share = WONE_amount.mul(depositAmount).div(totalUSDAmount); 
        uint256 SUSHI_share = SUSHI_amount.mul(depositAmount).div(totalUSDAmount);
        uint256 WETH_share = WETH_amount.mul(depositAmount).div(totalUSDAmount);
        uint256 WBTC_share = WBTC_amount.mul(depositAmount).div(totalUSDAmount);

        swap(WONE_share, uint256(0), USDCToWONEPath, address(this), uint256(-1));
        swap(SUSHI_share, uint256(0), USDCToSUSHIPath, address(this), uint256(-1));
        swap(WETH_share, uint256(0), USDCToWETHPath, address(this), uint256(-1));
        swap(WBTC_share, uint256(0), USDCToWBTCPath, address(this), uint256(-1));
    }

    function swapIntoFourEqualParts(uint256 amount) public {
        swap(amount.div(4), uint256(0), USDCToWONEPath, address(this), uint256(-1));
        swap(amount.div(4), uint256(0), USDCToSUSHIPath, address(this), uint256(-1));
        swap(amount.div(4), uint256(0), USDCToWETHPath, address(this), uint256(-1));
        swap(amount.div(4), uint256(0), USDCToWBTCPath, address(this), uint256(-1));
    }

    function setSharesFirstTime(address user) public {
        userNumberOfShares[user] = 100000000;
        totalNumberOfShares = 100000000;
    }

    function updateSharesOnDeposit(address user, uint256 total_in_USD, uint256 deposit_amount) public { //make this ownable - only contract itself can update this?
        uint256 newSharesForUser = deposit_amount.mul(totalNumberOfShares).div(total_in_USD);
        totalNumberOfShares = totalNumberOfShares.add(newSharesForUser);
        if (userNumberOfShares[user] > 0) {
            userNumberOfShares[user] = userNumberOfShares[user].add(newSharesForUser);
        } else {
            userNumberOfShares[user] = newSharesForUser;
        }
    }

    function withdrawUserFunds(address user) public {

        uint256 WONE_amount = getUserShares(user).mul(balanceOf(WONE_ADDRESS, address(this))).div(totalNumberOfShares);
        uint256 SUSHI_amount = getUserShares(user).mul(balanceOf(SUSHI_ADDRESS, address(this))).div(totalNumberOfShares);
        uint256 WETH_amount = getUserShares(user).mul(balanceOf(WETH_ADDRESS, address(this))).div(totalNumberOfShares);
        uint256 WBTC_amount = getUserShares(user).mul(balanceOf(WBTC_ADDRESS, address(this))).div(totalNumberOfShares);

        approveSpendingWholeBalance(WONE_ADDRESS, SUSHISWAP_ROUTER);
        approveSpendingWholeBalance(SUSHI_ADDRESS, SUSHISWAP_ROUTER);
        approveSpendingWholeBalance(WETH_ADDRESS, SUSHISWAP_ROUTER);
        approveSpendingWholeBalance(WBTC_ADDRESS, SUSHISWAP_ROUTER);

        swapFourTokensBackToUSDC(WONE_amount, SUSHI_amount, WETH_amount, WBTC_amount);

        approveSpendingWholeBalance(USDC_ADDRESS, user);
        
        uint256 USDC_amount = balanceOf(USDC_ADDRESS, address(this));
        IERC20(USDC_ADDRESS).transfer(user, USDC_amount);

        updateSharesOnWithdrawal(user);
    }

    function executeThreeSwaps(
        address _from1, address _to1, uint256 _amount1,
        address _from2, address _to2, uint256 _amount2,
        address _from3, address _to3, uint256 _amount3
        ) public {
            executeRebalancingSwap(_from1, _to1, _amount1);
            executeRebalancingSwap(_from2, _to2, _amount2);
            executeRebalancingSwap(_from3, _to3, _amount3);
    }

    function executeRebalancingSwap(address _tokenToSwap, address _tokenSwappingTo, uint256 _amountToBeSwapped) public {
        approve_spending(_tokenToSwap, SUSHISWAP_ROUTER, _amountToBeSwapped);
        if (_tokenToSwap == WONE_ADDRESS || _tokenSwappingTo == WONE_ADDRESS) {
            address[] memory _path = new address[](2);
            _path[0] = _tokenToSwap;
            _path[1] = _tokenSwappingTo;
            swap(_amountToBeSwapped, uint256(0), _path, address(this), uint256(-1));
        } else {
            address[] memory _path = new address[](3);
            _path[0] = _tokenToSwap;
            _path[1] = WONE_ADDRESS;
            _path[2] = _tokenSwappingTo;
            swap(_amountToBeSwapped, uint256(0), _path, address(this), uint256(-1));
        }
        
    }

    function approveSpendingWholeBalance(address _token, address _spender) public {
        uint256 tokenBalance = IERC20(_token).balanceOf(address(this));
        approve_spending(_token, _spender, tokenBalance);
    }

    function swapFourTokensBackToUSDC(uint256 WONE_amount, uint256 SUSHI_amount, uint256 WETH_amount, uint256 WBTC_amount) public {
        swap(WONE_amount, uint256(0), WONEToUSDCPath, address(this), uint256(-1));
        swap(SUSHI_amount, uint256(0), SUSHIToUSDCPath, address(this), uint256(-1));
        swap(WETH_amount, uint256(0), WETHToUSDCPath, address(this), uint256(-1));
        swap(WBTC_amount, uint256(0), WBTCToUSDCPath, address(this), uint256(-1));
    }
    
    function withdraw_matic(uint256 amount_) public {
        msg.sender.transfer(amount_); //TODO - change?
    }

    function withdrawAllUSDC(address _user) public {
        approveSpendingWholeBalance(USDC_ADDRESS, _user);
        uint256 USDC_amount = balanceOf(USDC_ADDRESS, address(this));
        IERC20(USDC_ADDRESS).transfer(_user, USDC_amount);
    }

    function withdrawAll(address _user, address _token_address) public {
        approveSpendingWholeBalance(_token_address, _user);
        uint256 USDC_amount = balanceOf(_token_address, address(this));
        IERC20(_token_address).transfer(_user, USDC_amount);
    }

    function balanceOf(address token_address, address user_address) public view returns (uint256 token_balance) {
        IERC20 _token = IERC20(token_address);
        token_balance = _token.balanceOf(user_address);
        return token_balance;
    }
    
    function swap(uint256 _amountIn, uint256 _amountOutMin, address[] memory _path, address _acct, uint256 _deadline) public {
        
       sushiSwapRouter.swapExactTokensForTokens(
            _amountIn,
            _amountOutMin,
            _path,
            _acct,
            _deadline);
        }      
    }
    

    